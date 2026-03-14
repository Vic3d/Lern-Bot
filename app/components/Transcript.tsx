'use client';

interface TranscriptProps {
  text: string;
}

export default function Transcript({ text }: TranscriptProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700">
      <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
        <span>📄</span> Transcript
      </h3>
      <div className="prose dark:prose-invert max-w-none">
        <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-lg whitespace-pre-wrap font-light">
          {text}
        </p>
      </div>
    </div>
  );
}
