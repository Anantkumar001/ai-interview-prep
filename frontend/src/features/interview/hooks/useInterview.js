import { useState,useContext } from "react";
import {getInterviewReportById, generateInterviewReport, getAllInterviewReports } from "../services/interview.api"
import { InterviewContext } from "../interview.context.jsx";

export const useInterview = () => {
  const context=useContext(InterviewContext)
  if(!context){
    throw new Error("useInterview must be used within InterviewProvider")
  }
  const {loading, setLoading, report, setReport, reports, setReports}=context

  const generateReport=async ({jobDescription, selfDescription, resume})=>{
    setLoading(true)
    let response=null
    try{
      response=await generateInterviewReport({jobDescription, selfDescription, resume})
      if (response && response.interviewReport) setReport(response.interviewReport)
      return response?.interviewReport ?? null
    } catch (error) {
        console.error("Error generating interview report:", error)
        throw error
    } finally {
        setLoading(false)
    }
  }

  const getReportById=async (interviewId)=>{
    setLoading(true)
    let response=null
    try{
      response=await getInterviewReportById(interviewId)
      if (response && response.interviewReport) setReport(response.interviewReport)
    } catch (error) {
        console.error("Error fetching interview report:", error)
    } finally {
        setLoading(false)
    }
    return response?.interviewReport ?? null
  }

  const getReports=async ()=>{
    setLoading(true)
    let response=null
    try{
        response=await getAllInterviewReports()
      if (response && response.interviewReports) setReports(response.interviewReports)
    } catch (error) {
        console.error("Error fetching interview reports:", error)
    } finally {
        setLoading(false)
    }
    return reports
  }

  return {loading, report, reports, generateReport, getReportById, getReports}
};