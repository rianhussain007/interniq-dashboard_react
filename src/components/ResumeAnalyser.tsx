import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, FileText, Mail, Phone, Wrench } from 'lucide-react';

// NOTE: To enable PDF text extraction, you need to install and set up `pdf.js`.
// Run: npm install pdfjs-dist
// Then, you can use the code commented out in the handleFileChange function.
import * as pdfjsLib from 'pdfjs-dist/build/pdf';

// Specify the worker source - this is crucial for the library to work in a Vite environment
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const skillKeywords = [
    'Python', 'Java', 'JavaScript', 'TypeScript', 'C++', 'C#', 'React', 'Angular', 'Vue.js', 'Node.js',
    'SQL', 'MongoDB', 'AWS', 'Azure', 'Docker', 'Kubernetes', 'Git', 'Machine Learning', 'Agile'
];

const extractEmail = (text: string) => text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] || null;
const extractPhone = (text: string) => text.match(/\b(?:\(\d{3}\)|\d{3})[-.]?\d{3}[-.]?\d{4}\b/)?.[0] || null;
const extractSkills = (text: string) => {
    const foundSkills = new Set<string>();
    const textLower = text.toLowerCase();
    skillKeywords.forEach(skill => {
        if (textLower.includes(skill.toLowerCase())) {
            foundSkills.add(skill);
        }
    });
    return Array.from(foundSkills).sort();
};

interface AnalysisResult {
    email: string | null;
    phone: string | null;
    skills: string[];
}

export const ResumeAnalyser = () => {
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [fileName, setFileName] = useState('');

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.type === 'application/pdf') {
            setFileName(file.name);
            setLoading(true);
            setError('');
            setAnalysis(null);

            try {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
                let text = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const content = await page.getTextContent();
                    text += content.items.map(item => (item as any).str).join(' ');
                }
                setAnalysis({
                    email: extractEmail(text),
                    phone: extractPhone(text),
                    skills: extractSkills(text),
                });
            } catch (err) {
                setError('Error parsing PDF file.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        } else {
            setError('Please upload a valid PDF file.');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
            <div className="container mx-auto px-4 py-8">
                <header className="text-center mb-12">
                    <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">Resume Analyser</h1>
                    <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">Get instant feedback on your resume.</p>
                </header>

                <div className="max-w-2xl mx-auto">
                    <label htmlFor="resume-upload" className="relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <UploadCloud className="w-10 h-10 mb-3 text-gray-400" />
                            <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">PDF (MAX. 5MB)</p>
                            {fileName && <p className="mt-4 text-sm text-green-500">{fileName}</p>}
                        </div>
                        <input id="resume-upload" type="file" className="hidden" accept=".pdf" onChange={handleFileChange} />
                    </label>
                    {loading && <p className="text-center mt-4">Analysing...</p>}
                    {error && <p className="text-red-500 text-center mt-4">{error}</p>}
                </div>

                {analysis && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-12 max-w-4xl mx-auto">
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
                            <h2 className="text-2xl font-bold mb-6">Analysis Results</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex items-start"><Mail className="h-6 w-6 mr-3 mt-1 text-indigo-500"/><div><h3 className="font-semibold">Email</h3><p>{analysis.email || 'Not found'}</p></div></div>
                                <div className="flex items-start"><Phone className="h-6 w-6 mr-3 mt-1 text-indigo-500"/><div><h3 className="font-semibold">Phone</h3><p>{analysis.phone || 'Not found'}</p></div></div>
                                <div className="md:col-span-2 flex items-start"><Wrench className="h-6 w-6 mr-3 mt-1 text-indigo-500"/><div><h3 className="font-semibold">Skills Found ({analysis.skills.length})</h3><div className="flex flex-wrap gap-2 mt-2">{analysis.skills.map(s => <span key={s} className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 text-xs font-medium rounded-full">{s}</span>)}</div></div></div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
};
