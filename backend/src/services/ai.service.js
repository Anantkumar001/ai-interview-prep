const { GoogleGenAI } = require("@google/genai")
const { z } = require("zod")
const { zodToJsonSchema } = require("zod-to-json-schema")

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
})

const defaultModels = ["gemini-2.5-flash"]

async function generateContentWithFallback({ prompt, schema, modelCandidates = defaultModels, maxRetries = 3 }) {
    const sleep = (ms) => new Promise((res) => setTimeout(res, ms))
    let lastError

    for (const model of modelCandidates) {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await ai.models.generateContent({
                    model,
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: zodToJsonSchema(schema),
                    }
                })
            } catch (err) {
                lastError = err
                const message = String(err?.message || "").toLowerCase()
                const status = err?.response?.status || err?.status

                const isTransient = status === 503 || status === 429 || message.includes("high demand") || message.includes("unavailable") || message.includes("quota") || message.includes("resource_exhausted")

                if (!isTransient) {
                    throw err
                }

                // try to parse RetryInfo if present (e.g. "40s")
                let retryAfterMs = null
                try {
                    const details = err?.response?.data?.error?.details || err?.response?.data?.details || []
                    const retryDetail = Array.isArray(details) && details.find(d => String(d["@type"] || "").toLowerCase().includes("retryinfo"))
                    if (retryDetail && retryDetail.retryDelay) {
                        const m = String(retryDetail.retryDelay).match(/(\d+(?:\.\d+)?)s/)
                        if (m) retryAfterMs = Math.round(parseFloat(m[1]) * 1000)
                    }
                } catch (e) {
                    // ignore parse errors
                }

                if (retryAfterMs === null) {
                    // exponential backoff with jitter
                    const base = Math.min(30, Math.pow(2, attempt)) * 1000
                    const jitter = Math.floor(Math.random() * 500)
                    retryAfterMs = base + 500 + jitter
                }

                console.warn(`AI model ${model} transient error (attempt ${attempt + 1}/${maxRetries}), retrying in ${retryAfterMs}ms:`, err?.message || err)
                await sleep(retryAfterMs)
                continue
            }
        }

        console.warn(`AI model ${model} failed after ${maxRetries} attempts — trying next fallback model if available.`)
    }

    throw lastError || new Error("AI request failed for all fallback models")
}

function buildInterviewReportPrompt({ resume, selfDescription, jobDescription, retry = false }) {
    let prompt = `Generate an interview report for a candidate using only the provided candidate profile and the target job description:\n` +
        `Resume: ${resume || "N/A"}\n` +
        `Self Description: ${selfDescription || "N/A"}\n` +
        `Job Description: ${jobDescription || "N/A"}\n\n` +
        `Use the details from the resume/self-description and job description to create a tailored, differentiated report. ` +
        `Avoid generic interview questions and make each question specific to the candidate's experience, technologies, domain, seniority, and the role requirements. ` +
        `If the resume or self-description includes concrete skills, projects, tools, or domain expertise, reference those in the questions, answers, and gaps. ` +
        `Do not use placeholder values such as "Day 1", "Day 2", "tasks", or repeated labels as the day focus. Each plan day should have a real study focus and meaningful tasks. ` +
        `Always compute matchScore based on the actual fit between the candidate profile and the job description. ` +
        `Use this scale: 80-100 means strong fit, 60-79 means moderate fit, and 0-59 means weak fit. ` +
        `If the resume/self-description lacks required seniority, key skills, or domain experience, return a weak score, even if the job description is high-end.\n\n` +
        `Return ONLY a valid JSON object (no markdown, no extra text) with exactly these fields:\n` +
        `{\n` +
        `  "matchScore": <number 0-100>,\n` +
        `  "title": "<job title string>",\n` +
        `  "technicalQuestions": [{"question": "<text>", "intention": "<text>", "answer": "<text>"}, ...],\n` +
        `  "behavioralQuestions": [{"question": "<text>", "intention": "<text>", "answer": "<text>"}, ...],\n` +
        `  "skillGaps": [{"skill": "<text>", "severity": "low|medium|high"}, ...],\n` +
        `  "preparationPlan": [{"day": <number>, "focus": "<text>", "tasks": ["<text>", ...]}, ...]\n` +
        `}\n\n` +
        `IMPORTANT: Output only raw string values for field contents. Do NOT include field names, colons, or markdown characters inside values. ` +
        `Be sure the report is unique, non-repetitive, and carefully aligned to the candidate profile and job description. ` +
        `Provide at least 3 technical questions, 3 behavioral questions, 3 skill gaps, and a 5-day preparation plan.`

    if (retry) {
        prompt += "\n\nCRITICAL: The previous response had corrupted values. This time, ensure each array item is a valid JSON object with complete, clean string values. Also ensure the content is unique and tailored to the candidate profile rather than generic interview templates. " +
                  "Calculate matchScore strictly from the fit between the resume/self-description and the job description, and use the scale: 80-100 strong, 60-79 moderate, 0-59 weak."
    }

    return prompt
}

function normalizeInterviewReport(input) {
    const normalized = { ...input }

    const cleanJsonFragment = (str) => {
        if (typeof str !== 'string') return str
        // Remove patterns like "question\":\" or "field\":\" or "tasks\":[
        return str
            .replace(/^"?[a-zA-Z_]+"\s*:\s*"?/g, '')  // Remove leading field names and colons
            .replace(/"\s*,\s*"[a-zA-Z_]+"\s*:\s*"?/g, ' ')  // Remove middle field patterns
            .replace(/["\[\]]*$/g, '')  // Remove trailing quotes/brackets
            .trim()
    }

    const normalizeQuestionItem = (item) => {
        if (typeof item === 'string') {
            return { question: cleanJsonFragment(item), intention: 'Provide reasoning and expected answer', answer: 'Answer outline not available' }
        }
        return {
            question: cleanJsonFragment(String(item?.question || item?.text || item?.questionText || '')) || 'Question not available',
            intention: cleanJsonFragment(String(item?.intention || item?.purpose || '')) || 'Provide reasoning and expected answer',
            answer: cleanJsonFragment(String(item?.answer || item?.solution || item?.response || '')) || 'Answer outline not available'
        }
    }

    const normalizeSkillGapItem = (item) => {
        if (typeof item === 'string') {
            return { skill: cleanJsonFragment(item), severity: 'low' }
        }
        return {
            skill: cleanJsonFragment(String(item?.skill || item?.name || item?.topic || '')) || 'General skill gap',
            severity: ['low', 'medium', 'high'].includes(String(item?.severity || '').toLowerCase())
                ? String(item?.severity || '').toLowerCase()
                : 'low'
        }
    }

    const isPlaceholderFocus = (value) => {
        if (typeof value !== 'string') return false
        const trimmed = value.trim().toLowerCase()
        return /^(day\s*\d+|tasks?|day\s*:\s*\d+|review|practice|project)$/i.test(trimmed)
    }

    const normalizePlanItem = (item, index) => {
        if (typeof item === 'string') {
            const focus = cleanJsonFragment(item)
            return { day: index + 1, focus: isPlaceholderFocus(focus) ? 'Study relevant topics and role-specific skills' : focus, tasks: [] }
        }
        const rawFocus = cleanJsonFragment(String(item?.focus || item?.title || item?.summary || '')).trim()
        const focus = rawFocus && !isPlaceholderFocus(rawFocus)
            ? rawFocus
            : 'Study relevant topics and role-specific skills'

        return {
            day: Number(item?.day) || index + 1,
            focus,
            tasks: Array.isArray(item?.tasks)
                ? item.tasks.map(task => cleanJsonFragment(String(task)).trim()).filter(Boolean)
                : []
        }
    }

    const normalizeMatchScore = (value) => {
        if (typeof value === 'number' && !Number.isNaN(value)) {
            return Math.min(100, Math.max(0, value))
        }
        if (typeof value === 'string') {
            const numeric = Number(String(value).replace(/[^0-9.]+/g, ''))
            if (!Number.isNaN(numeric)) {
                return Math.min(100, Math.max(0, numeric))
            }
        }
        return 0
    }

    normalized.matchScore = normalizeMatchScore(normalized.matchScore)

    if (Array.isArray(normalized.technicalQuestions)) {
        normalized.technicalQuestions = normalized.technicalQuestions.map(normalizeQuestionItem)
    }

    if (Array.isArray(normalized.behavioralQuestions)) {
        normalized.behavioralQuestions = normalized.behavioralQuestions.map(normalizeQuestionItem)
    }

    if (Array.isArray(normalized.skillGaps)) {
        normalized.skillGaps = normalized.skillGaps.map(normalizeSkillGapItem)
    }

    if (Array.isArray(normalized.preparationPlan)) {
        normalized.preparationPlan = normalized.preparationPlan
            .map(normalizePlanItem)
            .sort((a, b) => Number(a.day) - Number(b.day))
            .map((item, index) => ({ ...item, day: index + 1 }))
    }

    // Ensure arrays are not empty and have minimum lengths for UI stability
    if (!Array.isArray(normalized.technicalQuestions) || normalized.technicalQuestions.length < 3) {
        normalized.technicalQuestions = normalized.technicalQuestions || []
    }
    if (!Array.isArray(normalized.behavioralQuestions) || normalized.behavioralQuestions.length < 3) {
        normalized.behavioralQuestions = normalized.behavioralQuestions || []
    }
    if (!Array.isArray(normalized.skillGaps) || normalized.skillGaps.length < 3) {
        normalized.skillGaps = normalized.skillGaps || []
    }
    if (!Array.isArray(normalized.preparationPlan) || normalized.preparationPlan.length < 5) {
        normalized.preparationPlan = normalized.preparationPlan || []
    }

    return normalized
}

const interviewReportSchema = z.object({
    matchScore: z.number().describe("A score between 0 and 100 indicating how well the candidate's profile matches the job describe"),
    technicalQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Technical questions that can be asked in the interview along with their intention and how to answer them"),
    behavioralQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Behavioral questions that can be asked in the interview along with their intention and how to answer them"),
    skillGaps: z.array(z.object({
        skill: z.string().describe("The skill which the candidate is lacking"),
        severity: z.enum([ "low", "medium", "high" ]).describe("The severity of this skill gap, i.e. how important is this skill for the job and how much it can impact the candidate's chances")
    })).describe("List of skill gaps in the candidate's profile along with their severity"),
    preparationPlan: z.array(z.object({
        day: z.number().describe("The day number in the preparation plan, starting from 1"),
        focus: z.string().describe("The main focus of this day in the preparation plan, e.g. data structures, system design, mock interviews etc."),
        tasks: z.array(z.string()).describe("List of tasks to be done on this day to follow the preparation plan, e.g. read a specific book or article, solve a set of problems, watch a video etc.")
    })).describe("A day-wise preparation plan for the candidate to follow in order to prepare for the interview effectively"),
    title: z.string().describe("The title of the job for which the interview report is generated"),
})

async function generateInterviewReport({ resume, selfDescription, jobDescription }) {
    const prompt = buildInterviewReportPrompt({ resume, selfDescription, jobDescription })
    const response = await generateContentWithFallback({
        prompt,
        schema: interviewReportSchema
    })

    let parsedResponse
    try {
        parsedResponse = JSON.parse(response.text)
    } catch (err) {
        throw new Error(`AI returned invalid JSON: ${response.text}`)
    }

    const validated = interviewReportSchema.safeParse(parsedResponse)
    if (validated.success) {
        return validated.data
    }

    const repaired = normalizeInterviewReport(parsedResponse)
    const repairedValidation = interviewReportSchema.safeParse(repaired)
    if (repairedValidation.success) {
        return repairedValidation.data
    }

    const retryPrompt = buildInterviewReportPrompt({ resume, selfDescription, jobDescription, retry: true })
    const retryResponse = await generateContentWithFallback({
        prompt: retryPrompt,
        schema: interviewReportSchema
    })

    let retryParsed
    try {
        retryParsed = JSON.parse(retryResponse.text)
    } catch (err) {
        throw new Error(`AI returned invalid JSON on retry: ${retryResponse.text}`)
    }

    const retryValidated = interviewReportSchema.safeParse(retryParsed)
    if (retryValidated.success) {
        return retryValidated.data
    }

    const retryRepaired = normalizeInterviewReport(retryParsed)
    const retryRepairedValidation = interviewReportSchema.safeParse(retryRepaired)
    if (retryRepairedValidation.success) {
        return retryRepairedValidation.data
    }

    throw new Error(`AI response failed schema validation: ${JSON.stringify(validated.error.issues, null, 2)}`)
}



async function generatePdfFromHtml(htmlContent) {
    const puppeteer = require("puppeteer")
    const browser = await puppeteer.launch()
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" })

    const pdfBuffer = await page.pdf({
        format: "A4",
        margin: {
            top: "20mm",
            bottom: "20mm",
            left: "15mm",
            right: "15mm"
        }
    })

    await browser.close()

    return pdfBuffer
}

async function generateResumePdf({ resume, selfDescription, jobDescription }) {

    const resumePdfSchema = z.object({
        html: z.string().describe("The HTML content of the resume which can be converted to PDF using any library like puppeteer")
    })

    const prompt = `Generate resume for a candidate with the following details:
                        Resume: ${resume}
                        Self Description: ${selfDescription}
                        Job Description: ${jobDescription}

                        the response should be a JSON object with a single field "html" which contains the HTML content of the resume which can be converted to PDF using any library like puppeteer.
                        The resume should be tailored for the given job description and should highlight the candidate's strengths and relevant experience. The HTML content should be well-formatted and structured, making it easy to read and visually appealing.
                        The content of resume should be not sound like it's generated by AI and should be as close as possible to a real human-written resume.
                        you can highlight the content using some colors or different font styles but the overall design should be simple and professional.
                        The content should be ATS friendly, i.e. it should be easily parsable by ATS systems without losing important information.
                        The resume should not be so lengthy, it should ideally be 1-2 pages long when converted to PDF. Focus on quality rather than quantity and make sure to include all the relevant information that can increase the candidate's chances of getting an interview call for the given job description.
                    `

    const response = await generateContentWithFallback({
        prompt,
        schema: resumePdfSchema
    })

    const jsonContent = JSON.parse(response.text)

    const pdfBuffer = await generatePdfFromHtml(jsonContent.html)

    return pdfBuffer

}

module.exports = { generateInterviewReport, generateResumePdf }