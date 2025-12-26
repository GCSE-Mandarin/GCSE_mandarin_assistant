import React, { useState, useEffect } from 'react';
import { ArrowLeft, Upload, FileText, Trash2, CheckCircle2, X, Loader2 } from 'lucide-react';
import { VocabList, VocabWord } from '../types';
import { saveVocabList, getVocabLists, deleteVocabList } from '../services/storage';

interface Props {
  onBack: () => void;
}

// Predefined categories (optional suggestions)
const SUGGESTED_CATEGORIES = [
  "Food & Drink",
  "Time & Dates",
  "Social Life",
  "School & Education",
  "Travel & Transport",
  "Health & Body",
  "Family & People",
  "Home & Environment"
];

// PDF parsing using pdf.js (loaded from CDN)
declare const pdfjsLib: any;

// Initialize PDF.js worker
const initPDFJS = () => {
  if (typeof window !== 'undefined' && (window as any).pdfjsLib) {
    (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
};

// Extract all Chinese characters from text
const extractChineseCharacters = (text: string): string[] => {
  // Chinese character regex (CJK Unified Ideographs)
  const chineseCharRegex = /[\u4e00-\u9fa5\u3400-\u4dbf\uf900-\ufaff]/g;
  const matches = text.match(chineseCharRegex);
  
  if (!matches) return [];
  
  // Get unique characters and filter out duplicates
  const uniqueChars = Array.from(new Set(matches));
  return uniqueChars;
};

// Extract text from PDF
const extractTextFromPDF = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Wait for pdf.js to be available
    const checkPDFJS = () => {
      const pdfjs = (window as any).pdfjsLib;
      if (pdfjs) {
        initPDFJS();
        extractPDF(file, pdfjs).then(resolve).catch(reject);
      } else {
        setTimeout(checkPDFJS, 100);
      }
    };
    
    // Start checking after a short delay to allow script to load
    setTimeout(checkPDFJS, 100);
  });
};

const extractPDF = async (file: File, pdfjs: any): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n';
  }
  
  return fullText;
};

// Parse text content - extract all Chinese characters
const parseTextContent = (text: string): string[] => {
  return extractChineseCharacters(text);
};

export const VocabManagement: React.FC<Props> = ({ onBack }) => {
  const [vocabLists, setVocabLists] = useState<VocabList[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [customCategory, setCustomCategory] = useState<string>('');
  const [useCustomCategory, setUseCustomCategory] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadVocabLists();
  }, []);

  const loadVocabLists = async () => {
    setLoading(true);
    const lists = await getVocabLists();
    setVocabLists(lists);
    setLoading(false);
  };

  // Get all unique categories from uploaded lists
  const getExistingCategories = (): string[] => {
    const categories = new Set<string>();
    vocabLists.forEach(list => {
      if (list.category) {
        categories.add(list.category);
      }
    });
    return Array.from(categories).sort();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    // Determine which category to use
    const categoryToUse = useCustomCategory ? customCategory.trim() : selectedCategory;
    
    if (!file || !categoryToUse) {
      setUploadError(useCustomCategory ? 'Please enter a category name' : 'Please select or enter a category');
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);
    setExtractedText(null);
    setShowPreview(false);

    try {
      let characters: string[] = [];
      const fileName = file.name;
      const fileExtension = fileName.split('.').pop()?.toLowerCase();

      if (fileExtension === 'pdf') {
        const text = await extractTextFromPDF(file);
        console.log('Extracted PDF text (first 500 chars):', text.substring(0, 500));
        console.log('Total length:', text.length);
        characters = extractChineseCharacters(text);
        
        if (characters.length === 0) {
          setExtractedText(text.substring(0, 1000));
          setShowPreview(true);
          throw new Error(`No Chinese characters found in the PDF. Click "Show extracted text preview" to see what was read from the file.`);
        }
      } else if (fileExtension === 'txt' || fileExtension === 'csv' || fileExtension === 'json') {
        const text = await file.text();
        console.log('Extracted text (first 500 chars):', text.substring(0, 500));
        characters = extractChineseCharacters(text);
        
        if (characters.length === 0) {
          setExtractedText(text.substring(0, 1000));
          setShowPreview(true);
          throw new Error(`No Chinese characters found in the file. Click "Show extracted text preview" to see what was read from the file.`);
        }
      } else {
        throw new Error('Unsupported file format. Please use CSV, JSON, PDF, or TXT.');
      }

      if (characters.length === 0) {
        throw new Error('No Chinese characters found in the file. Please check the file contains Chinese text.');
      }
      
      // Clear preview on success
      setExtractedText(null);
      setShowPreview(false);

      // Check if list exists for this category
      const existingList = vocabLists.find(list => list.category === categoryToUse);
      const vocabList: VocabList = {
        id: existingList?.id || crypto.randomUUID(),
        category: categoryToUse,
        characters: characters,
        uploadedAt: new Date().toISOString(),
        fileName: fileName
      };

      await saveVocabList(vocabList);
      await loadVocabLists();
      
      // Reset form
      setSelectedCategory('');
      setCustomCategory('');
      setUseCustomCategory(false);
      
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (error: any) {
      setUploadError(error.message || 'Failed to process file');
    } finally {
      setUploading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this vocabulary list?')) {
      await deleteVocabList(id);
      await loadVocabLists();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Vocabulary Management</h2>
            <p className="text-xs text-slate-500">Upload and manage vocabulary lists</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full">
        {/* Upload Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <h3 className="text-xl font-bold text-slate-800 mb-4">Upload Vocabulary List</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Category
              </label>
              
              {/* Toggle between predefined and custom category */}
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => {
                    setUseCustomCategory(false);
                    setCustomCategory('');
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    !useCustomCategory
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Use Predefined
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUseCustomCategory(true);
                    setSelectedCategory('');
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    useCustomCategory
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Create Custom
                </button>
              </div>

              {!useCustomCategory ? (
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                >
                  <option value="">Select a category</option>
                  {SUGGESTED_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  {getExistingCategories().filter(cat => !SUGGESTED_CATEGORIES.includes(cat)).length > 0 && (
                    <>
                      <option disabled>──────────</option>
                      {getExistingCategories()
                        .filter(cat => !SUGGESTED_CATEGORIES.includes(cat))
                        .map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </>
                  )}
                </select>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Enter custom category name (e.g., 'Lesson 1', 'Week 3', 'HSK Level 2')"
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                  />
                  {getExistingCategories().length > 0 && (
                    <div className="text-xs text-slate-500">
                      <p className="font-semibold mb-1">Existing categories:</p>
                      <div className="flex flex-wrap gap-1">
                        {getExistingCategories().map(cat => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              setCustomCategory(cat);
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 transition-colors"
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                File Upload
              </label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-brand-400 transition-colors">
                <input
                  type="file"
                  accept=".csv,.json,.pdf,.txt"
                  onChange={handleFileUpload}
                  disabled={(!selectedCategory && !customCategory.trim()) || uploading}
                  className="hidden"
                  id="vocab-file-input"
                />
                <label
                  htmlFor="vocab-file-input"
                  className={`cursor-pointer flex flex-col items-center gap-2 ${(!selectedCategory && !customCategory.trim()) || uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {uploading ? (
                    <>
                      <Loader2 size={32} className="text-brand-500 animate-spin" />
                      <span className="text-slate-600">Processing file...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={32} className="text-slate-400" />
                      <span className="text-slate-600 font-medium">
                        Click to upload or drag and drop
                      </span>
                      <span className="text-xs text-slate-500">
                        CSV, JSON, PDF, or TXT files
                      </span>
                    </>
                  )}
                </label>
              </div>
            </div>

            {uploadError && (
              <div className="space-y-3">
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700">
                  <X size={16} className="mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="text-sm block">{uploadError}</span>
                    {extractedText && (
                      <div className="mt-3">
                        <button
                          onClick={() => setShowPreview(!showPreview)}
                          className="text-xs text-red-600 hover:text-red-800 underline"
                        >
                          {showPreview ? 'Hide' : 'Show'} extracted text preview
                        </button>
                        {showPreview && (
                          <div className="mt-2 p-3 bg-white rounded border border-red-200 max-h-40 overflow-y-auto">
                            <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                              {extractedText}
                              {extractedText.length >= 1000 && '\n\n... (showing first 1000 characters)'}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {uploadSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
                <CheckCircle2 size={16} />
                <span className="text-sm">Vocabulary list uploaded successfully!</span>
              </div>
            )}

            <div className="bg-slate-50 p-4 rounded-lg text-xs text-slate-600">
              <p className="font-semibold mb-2">File Format Examples:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Any format:</strong> The app will extract all Chinese characters from the file</li>
                <li><strong>Supported formats:</strong> PDF, TXT, CSV, JSON</li>
                <li><strong>Note:</strong> All unique Chinese characters found in the file will be added to the vocabulary list</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Existing Lists */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-xl font-bold text-slate-800 mb-4">Uploaded Vocabulary Lists</h3>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={32} className="text-brand-500 animate-spin" />
            </div>
          ) : vocabLists.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <FileText size={48} className="mx-auto mb-4 text-slate-300" />
              <p>No vocabulary lists uploaded yet.</p>
              <p className="text-sm mt-2">Upload a file above to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {vocabLists.map(list => (
                <div
                  key={list.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-slate-800">{list.category}</h4>
                        <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
                          {list.characters.length} characters
                        </span>
                      </div>
                    {list.fileName && (
                      <p className="text-xs text-slate-500">File: {list.fileName}</p>
                    )}
                    <p className="text-xs text-slate-400">
                      Uploaded: {new Date(list.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(list.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete list"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

