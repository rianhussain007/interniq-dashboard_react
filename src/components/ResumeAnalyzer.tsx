import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, User, BrainCircuit, BookOpen, Briefcase, AlertTriangle, Loader } from 'lucide-react';

// Define the structure of the parsed resume data
interface ParsedResume {
  name: string;
  email: string;
  phone: string;
  skills: string[];
  education: string;
  experience: string;
}

// A reusable card component for displaying sections of the resume
const InfoCard = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.5 }}
    className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md"
  >
    <div className="flex items-center mb-4">
      {icon}
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white ml-3">{title}</h3>
    </div>
    <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{children}</div>
  </motion.div>
);

export const ResumeAnalyzer = () => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedResume | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError(null); // Clear previous errors on new file selection
    } else {
      setError('Please upload a valid PDF file.');
      setFile(null);
    }
  };

  const handleAnalyzeClick = async () => {
    if (!file) {
      setError('Please select a file to analyze.');
      return;
    }

    setLoading(true);
    setError(null);
    setParsedData(null);

    const formData = new FormData();
    formData.append('file', file);

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

    try {
      const response = await fetch(`${apiBaseUrl}/api/analyze-resume`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json() as { detail?: string };
        throw new Error(errorData.detail || 'Failed to analyze resume.');
      }

      const data: ParsedResume = await response.json();
      setParsedData(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to analyze resume.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg shadow-inner">
      <div className="max-w-2xl mx-auto text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Resume Analyzer</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Upload your resume in PDF format to automatically extract key information.
        </p>
      </div>

      {/* File Upload Section */}
      <div className="max-w-xl mx-auto flex flex-col items-center gap-4 p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
        <label htmlFor="resume-upload" className="cursor-pointer flex flex-col items-center text-indigo-600 dark:text-indigo-400">
          <Upload size={48} />
          <span className="mt-2 font-semibold">{file ? file.name : 'Click to upload a PDF'}</span>
        </label>
        <input id="resume-upload" type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
        <button
          onClick={handleAnalyzeClick}
          disabled={!file || loading}
          className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed flex items-center justify-center transition-colors duration-300"
        >
          {loading ? <Loader className="animate-spin mr-2" /> : <FileText className="mr-2" />}
          {loading ? 'Analyzing...' : 'Analyze Resume'}
        </button>
      </div>

      {/* Loading and Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-center p-4 mt-6 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400 max-w-xl mx-auto"
            role="alert"
          >
            <AlertTriangle className="w-5 h-5 mr-3" />
            <span className="font-medium">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Parsed Data Display */}
      {parsedData && (
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Contact Info */}
          <InfoCard title="Contact Information" icon={<User size={24} className="text-indigo-500" />}>
            <p><strong>Name:</strong> {parsedData.name}</p>
            <p><strong>Email:</strong> {parsedData.email}</p>
            <p><strong>Phone:</strong> {parsedData.phone}</p>
          </InfoCard>

          {/* Skills */}
          <InfoCard title="Skills" icon={<BrainCircuit size={24} className="text-indigo-500" />}>
            <ul className="list-disc list-inside grid grid-cols-2 gap-x-4">
              {parsedData.skills.map((skill, index) => <li key={index}>{skill}</li>)}
            </ul>
          </InfoCard>

          {/* Education */}
          <InfoCard title="Education" icon={<BookOpen size={24} className="text-indigo-500" />}>
            <p>{parsedData.education}</p>
          </InfoCard>

          {/* Experience */}
          <InfoCard title="Experience" icon={<Briefcase size={24} className="text-indigo-500" />}>
            <p>{parsedData.experience}</p>
          </InfoCard>
        </div>
      )}
    </div>
  );
};
