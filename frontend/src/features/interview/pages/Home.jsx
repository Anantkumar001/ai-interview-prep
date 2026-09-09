import React ,{useState,useRef} from "react";
import "../style/home.scss";
import { useInterview } from "../hooks/useInterview.js";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const {loading, generateReport}=useInterview()
  const [jobDescription, setJobDescription] = useState("");
  const [selfDescription, setSelfDescription] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const resumeInputRef=useRef()

  const navigate=useNavigate()

  const handleFileChange = (e) => {
    const file = e?.target?.files && e.target.files[0]
    setResumeFile(file || null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    const resume = resumeFile || (resumeInputRef.current && resumeInputRef.current.files[0])
    if (!resume && !selfDescription.trim()) {
      setError("Please provide either a resume or a short self-description.")
      return
    }

    setIsSubmitting(true)
    try {
      const data = await generateReport({jobDescription, selfDescription, resume})
      if (!data || !data._id) {
        setError("Could not generate report. Please try again.")
        return
      }
      navigate(`/interview/${data._id}`)
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Failed to generate report")
    } finally {
      setIsSubmitting(false)
    }
  }

  if(loading){
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Generating your personalized interview strategy...</p>
      </div>
    )
  }

  return (
    <main className="home">
      <section className="hero">
        <div className="hero-copy">
          <h1>
            Create Your Custom <span className="highlight-text">Interview Plan</span>
          </h1>
          <p className="subtitle">
            Let our AI analyze the job requirements and your unique profile to
            build a winning strategy.
          </p>
        </div>
      </section>

      <form className="interview-card" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="panel panel-left">
            <div className="panel-header">
              <span className="panel-title">Target Job Description</span>
              <span className="field-required">Required</span>
            </div>
            <textarea
              name="jobDescription"
              id="jobDescription"
              placeholder="Paste the full job description here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              maxLength={5000}
            />
            <div className="hint">e.g. Senior Frontend Engineer at Google requires proficiency in React, TypeScript, and large-scale system design...</div>
            <div className="char-count">{jobDescription.length}/5000 chars</div>
          </div>

          <div className="panel panel-right">
            <div className="panel-header">
              <span className="panel-title">Your Profile</span>
            </div>

            <div className="upload-card">
              <div className="upload-header">
                <p className="upload-label">Upload Resume</p>
                <span className="badge-best">BEST RESULTS</span>
              </div>
              <label className="upload-dropzone" htmlFor="resume">
                <span className="upload-icon">☁</span>
                <span>Click to upload or drag & drop</span>
                <small>PDF only(Max 5MB)</small>
              </label>
              <input
                hidden
                type="file"
                name="resume"
                ref={resumeInputRef}
                id="resume"
                accept=".pdf"
                onChange={handleFileChange}
              />
              {resumeFile && <p className="file-name">✓ Selected: {resumeFile.name}</p>}
            </div>

            <div className="or-divider">OR</div>

            <div className="panel-section">
              <div className="section-title">Quick Self-Description</div>
              <textarea
                name="selfDescription"
                id="selfDescription"
                placeholder="Briefly describe your experience, key skills, and years of experience if you don't have a resume handy..."
                value={selfDescription}
                onChange={(e) => setSelfDescription(e.target.value)}
              />
            </div>

            <div className="note-box">
              <span className="info-icon">ℹ</span>
              <span>Either a <strong>Resume</strong> or a <strong>Self Description</strong> is required to generate a personalized plan.</span>
            </div>

            {error && <div className="error-box">{error}</div>}

            <button type="submit" className="submit-button" disabled={isSubmitting}>
              <span className="button-icon">★</span>
              {isSubmitting ? "Generating..." : "Generate My Interview Strategy"}
            </button>
          </div>
        </div>

        <div className="form-footer">
          <span>AI-Powered Strategy Generation</span>
          <span className="dot">•</span>
          <span>Approx 30s</span>
        </div>
      </form>
    </main>
  );
};

export default Home;

