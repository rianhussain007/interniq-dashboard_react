export type ResumeTemplate = {
  id: string;
  name: string;
  description: string;
  style: string;
  accent: string;
};

export const resumeTemplates: ResumeTemplate[] = [
  { id: 'modern', name: 'Modern', description: 'Clean hierarchy with a confident accent color.', style: 'A clear, contemporary layout for technical and product roles.', accent: 'bg-indigo-600' },
  { id: 'classic', name: 'Classic', description: 'Traditional typography and straightforward sections.', style: 'A familiar, print-friendly format for any application.', accent: 'bg-slate-700' },
  { id: 'compact', name: 'Compact', description: 'Space-efficient and focused on your strongest evidence.', style: 'A tighter layout for students with several projects or experiences.', accent: 'bg-emerald-700' },
];
