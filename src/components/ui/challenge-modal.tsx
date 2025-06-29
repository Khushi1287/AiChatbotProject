import React, { useState, useRef, DragEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Upload, FileText, Image, BookOpen, Brain, Target, Clock, Settings, ArrowRight, ChevronRight, Check, X, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import * as Slider from '@radix-ui/react-slider';
import { geminiService } from '@/lib/gemini';

interface ChallengeModalProps {
  open: boolean;
  onClose: () => void;
  onStartChallenge: (challengeConfig: ChallengeConfig) => void;
}

export interface ChallengeConfig {
  source: 'document' | 'topic';
  documentFile?: File;
  topic?: string;
  questionType: 'subjective' | 'objective';
  numberOfQuestions: number;
  answerTiming: 'after_each' | 'at_final';
  customInstruction?: string;
  questions?: string;
}

export const ChallengeModal: React.FC<ChallengeModalProps> = ({ open, onClose, onStartChallenge }) => {
  const [step, setStep] = useState(1);
  const [source, setSource] = useState<'document' | 'topic'>('document');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [topic, setTopic] = useState('');
  const [questionType, setQuestionType] = useState<'subjective' | 'objective'>('objective');
  const [numberOfQuestions, setNumberOfQuestions] = useState(3);
  const [answerTiming, setAnswerTiming] = useState<'after_each' | 'at_final'>('after_each');
  const [customInstruction, setCustomInstruction] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const steps = [
    { title: 'Source', description: 'Choose your content' },
    { title: 'Type', description: 'Select question type' },
    { title: 'Questions', description: 'Set number and timing' },
    { title: 'Instructions', description: 'Add custom rules' },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check if file is an image, PDF, or text file
      const isImage = file.type.startsWith('image/');
      const isPDF = file.type === 'application/pdf';
      const isText = file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt');
      
      if (!isImage && !isPDF && !isText) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image, PDF, or text file only.",
          variant: "destructive",
        });
        return;
      }
      
      // Set size limits based on file type
      const maxSize = isPDF ? 100 * 1024 * 1024 : 10 * 1024 * 1024; // 100MB for PDF, 10MB for images and text
      const sizeDescription = isPDF ? "100MB" : "10MB";
      
      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: `Please upload a file smaller than ${sizeDescription}.`,
          variant: "destructive",
        });
        return;
      }
      setDocumentFile(file);
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (source === 'document' && !documentFile) {
        toast({
          title: "Document required",
          description: "Please upload a document to continue.",
          variant: "destructive",
        });
        return;
      }
      if (source === 'topic' && !topic.trim()) {
        toast({
          title: "Topic required",
          description: "Please enter a topic to continue.",
          variant: "destructive",
        });
        return;
      }
    }
    
    if (step < steps.length) {
      setStep(step + 1);
    } else {
      handleStartChallenge();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleStartChallenge = async () => {
    try {
      setIsLoading(true);
      
      const config: ChallengeConfig = {
        source,
        documentFile: source === 'document' ? documentFile : undefined,
        topic: source === 'topic' ? topic : undefined,
        questionType,
        numberOfQuestions,
        answerTiming,
        customInstruction: customInstruction.trim() || undefined,
      };

      let questions;
      if (source === 'document' && documentFile) {
        questions = await geminiService.handleDocumentChallenge(documentFile, config);
      } else if (source === 'topic' && topic) {
        questions = await geminiService.handleTopicChallenge(topic, config);
      } else {
        throw new Error('Please provide either a document or topic');
      }

      onStartChallenge({ ...config, questions });
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error starting challenge:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start challenge. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setSource('document');
    setDocumentFile(null);
    setTopic('');
    setQuestionType('objective');
    setNumberOfQuestions(3);
    setAnswerTiming('after_each');
    setCustomInstruction('');
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="h-6 w-6 text-gray-500" />;
    }
    if (file.type === 'application/pdf') {
      return <FileText className="h-6 w-6 text-gray-500" />;
    }
    return <FileText className="h-6 w-6 text-gray-500" />;
  };

  const CustomSlider = () => (
    <Slider.Root
      className="relative flex items-center select-none touch-none w-full h-5"
      value={[numberOfQuestions]}
      onValueChange={(value) => setNumberOfQuestions(value[0])}
      max={25}
      min={1}
      step={1}
    >
      <Slider.Track className="bg-muted relative grow rounded-full h-2">
        <Slider.Range className="absolute bg-primary rounded-full h-full" />
      </Slider.Track>
      <Slider.Thumb
        className="block w-5 h-5 bg-primary rounded-full border-2 border-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 transition-colors hover:bg-primary/90"
        aria-label="Number of questions"
      />
    </Slider.Root>
  );

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      
      // Check if file is an image, PDF, or text file
      const isImage = file.type.startsWith('image/');
      const isPDF = file.type === 'application/pdf';
      const isText = file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt');
      
      if (!isImage && !isPDF && !isText) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image, PDF, or text file only.",
          variant: "destructive",
        });
        return;
      }
      
      // Set size limits based on file type
      const maxSize = isPDF ? 100 * 1024 * 1024 : 10 * 1024 * 1024; // 100MB for PDF, 10MB for images and text
      const sizeDescription = isPDF ? "100MB" : "10MB";
      
      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: `Please upload a file smaller than ${sizeDescription}.`,
          variant: "destructive",
        });
        return;
      }
      setDocumentFile(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Challenge</DialogTitle>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="relative mb-8">
          <div className="absolute top-4 w-full h-0.5 bg-muted">
            <div
              className="absolute h-full bg-primary transition-all duration-300"
              style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
            />
          </div>
          <div className="relative flex justify-between">
            {steps.map((s, i) => (
              <div key={i} className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mb-2 transition-all duration-300 ${
                    step > i + 1
                      ? 'bg-primary border-primary text-primary-foreground'
                      : step === i + 1
                      ? 'bg-background border-primary text-primary'
                      : 'bg-muted border-muted-foreground/30 text-muted-foreground'
                  }`}
                >
                  {step > i + 1 ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span className="text-sm">{i + 1}</span>
                  )}
                </div>
                <span className={`text-xs font-medium ${
                  step === i + 1 ? 'text-primary' : 'text-muted-foreground'
                }`}>
                  {s.title}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {s.description}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Source Selection */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card
                  className={`cursor-pointer transition-all duration-200 ${
                    source === 'document'
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => setSource('document')}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center text-center space-y-2">
                      <div className={`p-3 rounded-full ${
                        source === 'document'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted'
                      }`}>
                        <FileText className="h-6 w-6" />
                      </div>
                      <h3 className="font-semibold">Document</h3>
                      <p className="text-sm text-muted-foreground">
                        Upload an image, PDF, or text file to create questions
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className={`cursor-pointer transition-all duration-200 ${
                    source === 'topic'
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => setSource('topic')}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center text-center space-y-2">
                      <div className={`p-3 rounded-full ${
                        source === 'topic'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted'
                      }`}>
                        <BookOpen className="h-6 w-6" />
                      </div>
                      <h3 className="font-semibold">Topic</h3>
                      <p className="text-sm text-muted-foreground">
                        Enter a topic or subject
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {source === 'document' ? (
                <div className="space-y-4">
                  <Label>Upload Document</Label>
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200 ${
                      isDragging 
                        ? 'border-primary bg-primary/5' 
                        : documentFile
                        ? 'bg-muted/50 border-primary/50'
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    {documentFile ? (
                      <div className="flex items-center justify-center gap-2">
                        {getFileIcon(documentFile)}
                        <div className="flex flex-col items-start">
                          <span className="text-sm font-medium">{documentFile.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {(documentFile.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="ml-2 h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDocumentFile(null);
                            if (fileInputRef.current) {
                              fileInputRef.current.value = '';
                            }
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                        <div className="text-sm text-muted-foreground">
                          {isDragging ? (
                            <span className="text-primary font-medium">Drop your file here</span>
                          ) : (
                            <>
                              <span className="font-medium text-primary">Click to upload</span>
                              {" or drag and drop"}
                            </>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Images & Text files, PDFs
                        </div>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*,application/pdf,.txt,text/plain"
                      onChange={handleFileChange}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Label>Enter Topic</Label>
                  <Input
                    placeholder="e.g. Ancient Roman History, Quantum Physics, etc."
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Question Type */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card
                  className={`cursor-pointer transition-all duration-200 ${
                    questionType === 'objective'
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => setQuestionType('objective')}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center text-center space-y-2">
                      <div className={`p-3 rounded-full ${
                        questionType === 'objective'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted'
                      }`}>
                        <Target className="h-6 w-6" />
                      </div>
                      <h3 className="font-semibold">Objective</h3>
                      <p className="text-sm text-muted-foreground">
                        Multiple choice, true/false
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className={`cursor-pointer transition-all duration-200 ${
                    questionType === 'subjective'
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => setQuestionType('subjective')}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center text-center space-y-2">
                      <div className={`p-3 rounded-full ${
                        questionType === 'subjective'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted'
                      }`}>
                        <Brain className="h-6 w-6" />
                      </div>
                      <h3 className="font-semibold">Subjective</h3>
                      <p className="text-sm text-muted-foreground">
                        Open-ended, descriptive
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Number of Questions and Timing */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label>Number of Questions</Label>
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{numberOfQuestions}</span>
                    <Badge variant="secondary" className="font-mono">
                      {numberOfQuestions === 1 ? '~2' : numberOfQuestions === 25 ? '45+' : `~${numberOfQuestions * 2}`} min
                    </Badge>
                  </div>
                  <div className="py-4">
                    <CustomSlider />
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Quick (1-5)</span>
                    <span>Standard (6-15)</span>
                    <span>Extended (16-25)</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 mt-8">
                <Label>Answer Timing</Label>
                <RadioGroup
                  value={answerTiming}
                  onValueChange={(value) => setAnswerTiming(value as 'after_each' | 'at_final')}
                  className="grid grid-cols-2 gap-4"
                >
                  <Card className={`cursor-pointer transition-all duration-200 ${
                    answerTiming === 'after_each'
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  }`}>
                    <CardContent className="p-6">
                      <RadioGroupItem
                        value="after_each"
                        id="after_each"
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor="after_each"
                        className="flex flex-col items-center text-center space-y-2 cursor-pointer"
                      >
                        <div className={`p-3 rounded-full ${
                          answerTiming === 'after_each'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted'
                        }`}>
                          <Clock className="h-6 w-6" />
                        </div>
                        <h3 className="font-semibold">After Each</h3>
                        <p className="text-sm text-muted-foreground">
                          Show answer after each question
                        </p>
                      </Label>
                    </CardContent>
                  </Card>

                  <Card className={`cursor-pointer transition-all duration-200 ${
                    answerTiming === 'at_final'
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  }`}>
                    <CardContent className="p-6">
                      <RadioGroupItem
                        value="at_final"
                        id="at_final"
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor="at_final"
                        className="flex flex-col items-center text-center space-y-2 cursor-pointer"
                      >
                        <div className={`p-3 rounded-full ${
                          answerTiming === 'at_final'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted'
                        }`}>
                          <Settings className="h-6 w-6" />
                        </div>
                        <h3 className="font-semibold">At Final</h3>
                        <p className="text-sm text-muted-foreground">
                          Show all answers at the end
                        </p>
                      </Label>
                    </CardContent>
                  </Card>
                </RadioGroup>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Custom Instructions */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="space-y-4">
              <Label>Custom Instructions (Optional)</Label>
              <Textarea
                placeholder="Add any specific instructions or rules for the challenge..."
                value={customInstruction}
                onChange={(e) => setCustomInstruction(e.target.value)}
                className="min-h-[150px]"
              />
              <p className="text-sm text-muted-foreground">
                You can specify additional rules, preferences, or focus areas for the questions.
              </p>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 1 || isLoading}
          >
            Back
          </Button>
          <Button 
            onClick={handleNext}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                {step === steps.length ? 'Start Challenge' : 'Next'}
                <ChevronRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};