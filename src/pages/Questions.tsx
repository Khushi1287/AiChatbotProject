import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { ChevronLeft, ChevronRight, Check, X, Brain, Target, Clock, Trophy, RotateCcw, Home, LogOut } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Question {
  id: number;
  text: string;
  type: 'subjective' | 'objective';
  marks: number;
  options?: {
    id: string;
    text: string;
  }[];
  correctAnswer?: string;
  explanation?: string;
  markingScheme?: {
    points: string[];
    marksPerPoint: number[];
  };
}

interface QuestionsState {
  questions: Question[];
  answerTiming: 'after_each' | 'at_final';
  title: string;
}

const Questions: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [currentAnswer, setCurrentAnswer] = useState<string>('');
  const [showExplanation, setShowExplanation] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [activeTab, setActiveTab] = useState<string>('question');
  const [showQuestionBreakdown, setShowQuestionBreakdown] = useState(false);
  const [showQuitConfirmation, setShowQuitConfirmation] = useState(false);
  const [visibleExplanations, setVisibleExplanations] = useState<Record<number, boolean>>({});

  const toggleExplanation = (questionId: number) => {
    setVisibleExplanations(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  // Parse state from location
  const state = location.state as QuestionsState;
  const { questions, answerTiming, title } = state || { questions: [], answerTiming: 'after_each', title: '' };
  const currentQuestion = questions[currentQuestionIndex];

  useEffect(() => {
    if (!state || !questions.length || !title) {
      navigate('/dashboard');
      toast({
        title: "Error",
        description: "No questions found. Please start a new challenge.",
        variant: "destructive",
      });
    }
  }, [state, questions, navigate, title]);

  useEffect(() => {
    setCurrentAnswer(userAnswers[currentQuestion?.id] || '');
  }, [currentQuestionIndex, currentQuestion?.id, userAnswers]);

  const handleAnswerSubmit = (answer: string) => {
    setCurrentAnswer(answer);
    
    if (answerTiming === 'after_each') {
      setUserAnswers(prev => ({ ...prev, [currentQuestion.id]: answer }));
      if (currentQuestion.type === 'objective') {
        setShowExplanation(true);
        setActiveTab('explanation');
        const isCorrect = answer === currentQuestion.correctAnswer;
        setScore(prev => prev + (isCorrect ? currentQuestion.marks : 0));
      }
    } else {
      setUserAnswers(prev => ({ ...prev, [currentQuestion.id]: answer }));
    }
  };

  const handleSubjectiveAnswerChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const answer = e.target.value;
    setCurrentAnswer(answer);
    
    if (answerTiming === 'after_each') {
      setUserAnswers(prev => ({ ...prev, [currentQuestion.id]: answer }));
    }
  };

  const handleSubjectiveSubmit = () => {
    if (currentQuestion.type === 'subjective' && currentAnswer.trim()) {
      setUserAnswers(prev => ({ ...prev, [currentQuestion.id]: currentAnswer }));
      setShowExplanation(true);
      setActiveTab('explanation');
    }
  };

  const handleNext = () => {
    if (answerTiming === 'at_final' && currentAnswer.trim()) {
      setUserAnswers(prev => ({ ...prev, [currentQuestion.id]: currentAnswer }));
    }
    
    setShowExplanation(false);
    setActiveTab('question');
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setCurrentAnswer('');
    } else if (!isSubmitted) {
      handleFinalSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setShowExplanation(false);
      setActiveTab('question');
    }
  };

  const handleFinalSubmit = () => {
    setIsSubmitted(true);
    if (answerTiming === 'at_final') {
      let totalScore = 0;
      questions.forEach(question => {
        if (question.type === 'objective') {
          const isCorrect = userAnswers[question.id] === question.correctAnswer;
          totalScore += isCorrect ? question.marks : 0;
        }
      });
      setScore(totalScore);
    }
    setShowExplanation(true);
    setActiveTab('explanation');
  };

  const calculateProgress = () => {
    return ((currentQuestionIndex + 1) / questions.length) * 100;
  };

  const calculateStats = () => {
    let totalQuestions = questions.length;
    let objectiveQuestions = questions.filter(q => q.type === 'objective').length;
    let subjectiveQuestions = totalQuestions - objectiveQuestions;
    let correctAnswers = questions.filter(q => 
      q.type === 'objective' && userAnswers[q.id] === q.correctAnswer
    ).length;
    let incorrectAnswers = objectiveQuestions - correctAnswers;
    let totalPossibleScore = questions.reduce((acc, q) => acc + q.marks, 0);
    let accuracy = objectiveQuestions > 0 ? (correctAnswers / objectiveQuestions) * 100 : 0;

    return {
      totalQuestions,
      objectiveQuestions,
      subjectiveQuestions,
      correctAnswers,
      incorrectAnswers,
      totalPossibleScore,
      accuracy: Math.round(accuracy)
    };
  };

  const handleRetry = () => {
    // Reset all state
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setCurrentAnswer('');
    setShowExplanation(false);
    setIsSubmitted(false);
    setScore(0);
    setActiveTab('question');
  };

  const handleGoHome = () => {
    navigate('/dashboard');
  };

  const handleQuit = () => {
    navigate('/dashboard');
    toast({
      title: "Exam Quit",
      description: "You have quit the exam. Your progress has not been saved.",
    });
  };

  if (!currentQuestion) return null;

  if (isSubmitted) {
    const stats = calculateStats();
    const scorePercentage = Math.round((score / stats.totalPossibleScore) * 100);
    return (
      <div className="container max-w-4xl mx-auto py-8 space-y-8">
        <Card className="border-2 shadow-lg overflow-hidden">
          <div className="bg-primary/10 p-6 text-center">
            <Trophy className="h-12 w-12 mx-auto text-primary mb-4" />
            <h1 className="text-2xl font-bold text-primary mb-2">Challenge Complete!</h1>
            <p className="text-muted-foreground">{title}</p>
          </div>
          
          <CardContent className="p-6 space-y-6">
            {/* Score Section */}
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">
                {scorePercentage}%
              </div>
              <p className="text-sm text-muted-foreground">Total Score</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <div className="text-2xl font-bold">{stats.totalQuestions}</div>
                <p className="text-sm text-muted-foreground">Total Questions</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">{stats.correctAnswers}</div>
                <p className="text-sm text-muted-foreground">Correct Answers</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-600">{stats.incorrectAnswers}</div>
                <p className="text-sm text-muted-foreground">Incorrect Answers</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <div className="text-2xl font-bold">{stats.accuracy}%</div>
                <p className="text-sm text-muted-foreground">Accuracy</p>
              </div>
            </div>

            {/* Question Breakdown Toggle */}
            <Button
              variant="outline"
              onClick={() => setShowQuestionBreakdown(!showQuestionBreakdown)}
              className="w-full"
            >
              {showQuestionBreakdown ? 'Hide' : 'Show'} Question Breakdown
            </Button>

            {/* Question Breakdown */}
            {showQuestionBreakdown && (
              <div className="space-y-4">
                <h3 className="font-semibold">Question Breakdown</h3>
                <div className="space-y-3">
                  {questions.map((question, index) => (
                    <div 
                      key={question.id} 
                      className={cn(
                        "p-4 rounded-lg border-2 transition-colors",
                        question.type === 'objective' 
                          ? userAnswers[question.id] === question.correctAnswer
                            ? "border-green-500 bg-green-3"
                            : "border-red-500 bg-red-3"
                          : "border-primary/50 bg-primary/5"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Question {index + 1}</span>
                          {question.type === 'objective' ? (
                            <Target className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Brain className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">{question.marks} marks</span>
                      </div>
                      <p className="text-sm mb-2">{question.text}</p>
                      {question.type === 'objective' && (
                        <>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">Your answer:</span>
                            <span className={cn(
                              "font-medium",
                              userAnswers[question.id] === question.correctAnswer
                                ? "text-green-600"
                                : "text-red-600"
                            )}>
                              {userAnswers[question.id]}
                            </span>
                            {userAnswers[question.id] !== question.correctAnswer && (
                              <>
                                <span className="text-muted-foreground">Correct:</span>
                                <span className="font-medium text-green-600">{question.correctAnswer}</span>
                              </>
                            )}
                          </div>
                          <div className="mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleExplanation(question.id)}
                              className="w-full justify-between"
                            >
                              Show Explanation
                              <ChevronRight className={cn(
                                "h-4 w-4 transition-transform",
                                visibleExplanations[question.id] && "rotate-90"
                              )} />
                            </Button>
                            {visibleExplanations[question.id] && (
                              <div className="mt-2 p-3 bg-muted/30 rounded text-sm">
                                <p className="text-muted-foreground">{question.explanation}</p>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                      {question.type === 'subjective' && (
                        <>
                          <div className="text-sm">
                            <span className="text-muted-foreground">Your answer:</span>
                            <p className="mt-1 p-3 bg-muted/30 rounded whitespace-pre-wrap">
                              {userAnswers[question.id]}
                            </p>
                          </div>
                          <div className="mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleExplanation(question.id)}
                              className="w-full justify-between"
                            >
                              Show Marking Scheme
                              <ChevronRight className={cn(
                                "h-4 w-4 transition-transform",
                                visibleExplanations[question.id] && "rotate-90"
                              )} />
                            </Button>
                            {visibleExplanations[question.id] && (
                              <div className="mt-2">
                                <ul className="list-none space-y-2">
                                  {question.markingScheme?.points.map((point, pointIndex) => (
                                    <li key={pointIndex} className="flex items-start gap-2 text-sm">
                                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium text-xs">
                                        {question.markingScheme?.marksPerPoint[pointIndex]}
                                      </span>
                                      <span className="flex-1 text-muted-foreground">{point}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="p-6 bg-muted/50 flex gap-4 justify-center">
            <Button
              variant="outline"
              onClick={handleRetry}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Try Again
            </Button>
            <Button
              onClick={handleGoHome}
              className="gap-2"
            >
              <Home className="h-4 w-4" />
              Go to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 space-y-6">      

      {/* Question Navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {currentQuestion.type === 'objective' ? (
            <Target className="h-5 w-5 text-primary" />
          ) : (
            <Brain className="h-5 w-5 text-primary" />
          )}
          <span className="text-sm font-medium">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {currentQuestion.marks} marks
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => setShowQuitConfirmation(true)}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Quit Exam
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <Progress value={calculateProgress()} className="h-2" />

      {/* Question dots navigation */}
      <div className="flex justify-center gap-2">
        {questions.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setCurrentQuestionIndex(index);
              setActiveTab('question');
            }}
            className={cn(
              "w-3 h-3 rounded-full transition-all",
              index === currentQuestionIndex
                ? "bg-primary scale-125"
                : userAnswers[questions[index].id]
                ? "bg-primary/50"
                : "bg-muted"
            )}
            disabled={!userAnswers[questions[index].id] && index > currentQuestionIndex}
          />
        ))}
      </div>

      <Card className="border-2 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">{currentQuestion.text}</CardTitle>
          <CardDescription>
            {currentQuestion.type === 'objective' ? (
              'Choose the correct option'
            ) : (
              <div className="flex items-center justify-between">
                <span>Write your detailed answer</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary hover:text-primary/80"
                  onClick={() => setActiveTab('explanation')}
                >
                  View Marking Scheme
                </Button>
              </div>
            )}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="question">Question</TabsTrigger>
              <TabsTrigger 
                value="explanation" 
                disabled={!showExplanation && currentQuestion.type === 'objective'}
              >
                {currentQuestion.type === 'objective' ? 'Explanation' : 'Marking Scheme'}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="question" className="mt-4">
              {currentQuestion.type === 'objective' ? (
                <RadioGroup
                  value={currentAnswer}
                  onValueChange={handleAnswerSubmit}
                  disabled={showExplanation}
                  className="space-y-3"
                >
                  {currentQuestion.options?.map(option => (
                    <label
                      key={option.id}
                      htmlFor={`option-${option.id}`}
                      className={cn(
                        "relative flex items-center rounded-lg border-2 p-4 transition-all cursor-pointer",
                        showExplanation && option.id === currentQuestion.correctAnswer
                          ? "border-green-500 bg-green-3"
                          : showExplanation && option.id === userAnswers[currentQuestion.id]
                          ? "border-red-500 bg-red-3"
                          : "hover:bg-muted hover:border-primary",
                        !showExplanation && "hover:scale-[1.01] active:scale-[0.99]"
                      )}
                    >
                      <div className="flex flex-1 items-center gap-3">
                        <RadioGroupItem
                          value={option.id}
                          id={`option-${option.id}`}
                          className="peer"
                        />
                        <span className="text-sm flex-1">{option.text}</span>
                        {showExplanation && (
                          <span className="ml-2 flex-shrink-0">
                            {option.id === currentQuestion.correctAnswer ? (
                              <Check className="h-5 w-5 text-green-500" />
                            ) : option.id === userAnswers[currentQuestion.id] ? (
                              <X className="h-5 w-5 text-red-500" />
                            ) : null}
                          </span>
                        )}
                      </div>
                    </label>
                  ))}
                </RadioGroup>
              ) : (
                <div className="space-y-4">
                  <Textarea
                    placeholder="Write your detailed answer here..."
                    value={currentAnswer}
                    onChange={handleSubjectiveAnswerChange}
                    disabled={showExplanation}
                    className="min-h-[200px] resize-none"
                  />
                  {!showExplanation && currentAnswer?.trim() && (
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={handleSubjectiveSubmit}
                      >
                        Submit Answer
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="explanation" className="mt-4">
              {currentQuestion.type === 'objective' ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <div className="flex items-center gap-2 mb-2">
                      {userAnswers[currentQuestion.id] === currentQuestion.correctAnswer ? (
                        <>
                          <Check className="h-5 w-5 text-green-500" />
                          <h3 className="font-semibold text-green-600">Correct Answer!</h3>
                        </>
                      ) : (
                        <>
                          <X className="h-5 w-5 text-red-500" />
                          <h3 className="font-semibold text-red-600">Incorrect Answer</h3>
                        </>
                      )}
                    </div>
                    <p className="text-sm">{currentQuestion.explanation}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">Marking Scheme</h3>
                      <span className="text-sm text-muted-foreground">
                        Total: {currentQuestion.markingScheme?.marksPerPoint.reduce((a, b) => a + b, 0)} marks
                      </span>
                    </div>
                    <ul className="list-none space-y-3">
                      {currentQuestion.markingScheme?.points.map((point, index) => (
                        <li key={index} className="flex items-start gap-3 text-sm">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium">
                            {currentQuestion.markingScheme?.marksPerPoint[index]}
                          </span>
                          <span className="flex-1">{point}</span>
                        </li>
                      ))}
                    </ul>
                    {showExplanation && (
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="font-medium mb-2">Your Submitted Answer:</h4>
                        <p className="text-sm whitespace-pre-wrap bg-muted/30 p-3 rounded">
                          {userAnswers[currentQuestion.id]}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className="flex justify-between border-t bg-muted/50 p-6">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="flex items-center gap-4">
            {isSubmitted && (
              <div className="text-lg font-semibold">
                Score: {score}/{questions.reduce((acc, q) => acc + q.marks, 0)}
              </div>
            )}
            <Button
              onClick={handleNext}
              disabled={!userAnswers[currentQuestion.id] || (showExplanation && isSubmitted)}
              className="gap-2"
            >
              {currentQuestionIndex < questions.length - 1 ? (
                <>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </>
              ) : !isSubmitted ? (
                'Submit All'
              ) : (
                'Finish'
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Quit Confirmation Dialog */}
      <AlertDialog open={showQuitConfirmation} onOpenChange={setShowQuitConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quit Exam?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to quit the exam? Your progress will not be saved and you'll need to start over if you want to attempt this exam again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Exam</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleQuit}
              className="bg-destructive hover:bg-destructive/90"
            >
              Yes, Quit Exam
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Questions; 