import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface DemoModalProps {
  open: boolean;
  onClose: () => void;
}

interface ChatMessage {
  id: number;
  type: 'user' | 'ai';
  message: string;
  delay: number;
}

const demoMessages: ChatMessage[] = [
  { id: 1, type: 'user', message: 'Hey! Can you help me plan a birthday party?', delay: 1000 },
  { id: 2, type: 'ai', message: 'Absolutely! I\'d love to help you plan an amazing birthday party! 🎉', delay: 2000 },
  { id: 3, type: 'ai', message: 'Tell me - what\'s the age of the birthday person and do you have a theme in mind?', delay: 3500 },
  { id: 4, type: 'user', message: 'It\'s for my 8-year-old daughter, she loves unicorns!', delay: 5000 },
  { id: 5, type: 'ai', message: 'Perfect! A unicorn theme party will be magical! ✨ Here\'s what I suggest:', delay: 6500 },
  { id: 6, type: 'ai', message: '🦄 Decorations: Pastel balloons, unicorn banners, rainbow streamers\n🎂 Cake: Unicorn-shaped or rainbow layers\n🎈 Activities: Pin the horn on the unicorn, unicorn crafts\n🎁 Party favors: Unicorn stickers, mini figures, sparkly slime', delay: 8000 },
  { id: 7, type: 'user', message: 'This is amazing! Can you suggest a simple unicorn cake recipe?', delay: 10000 },
  { id: 8, type: 'ai', message: 'Of course! Here\'s an easy rainbow unicorn cake recipe...', delay: 11500 },
];

export const DemoModal: React.FC<DemoModalProps> = ({ open, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingMessage, setTypingMessage] = useState<string>('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (open && !isPlaying) {
      setIsPlaying(true);
      setMessages([]);
      setCurrentMessageIndex(0);
      playDemo();
    }
  }, [open]);

  const playDemo = () => {
    let messageIndex = 0;
    const showNextMessage = () => {
      if (messageIndex < demoMessages.length) {
        const currentMsg = demoMessages[messageIndex];
        
        setTimeout(() => {
          if (currentMsg.type === 'ai') {
            setIsTyping(true);
            typeMessage(currentMsg.message, () => {
              setMessages(prev => [...prev, currentMsg]);
              setIsTyping(false);
              setTypingMessage('');
              messageIndex++;
              showNextMessage();
            });
          } else {
            setMessages(prev => [...prev, currentMsg]);
            messageIndex++;
            showNextMessage();
          }
        }, currentMsg.delay);
      } else {
        setIsPlaying(false);
      }
    };
    showNextMessage();
  };

  const typeMessage = (message: string, onComplete: () => void) => {
    let index = 0;
    const typeChar = () => {
      if (index < message.length) {
        setTypingMessage(prev => prev + message[index]);
        index++;
        setTimeout(typeChar, 30);
      } else {
        onComplete();
      }
    };
    setTypingMessage('');
    typeChar();
  };

  const restartDemo = () => {
    setMessages([]);
    setTypingMessage('');
    setIsTyping(false);
    setCurrentMessageIndex(0);
    setIsPlaying(true);
    playDemo();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            ChatGenius Live Demo ✨
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex gap-6 h-[600px]">
          {/* Chat Interface */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="bg-muted/20 rounded-lg p-4 mb-4 flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="font-semibold">ChatGenius AI</span>
                  <Badge variant="secondary" className="text-xs">Online</Badge>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={restartDemo}
                  className="text-xs"
                >
                  Restart Demo
                </Button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-card/30 rounded-lg border scrollbar-hide">
              <style jsx>{`
                .scrollbar-hide {
                  -ms-overflow-style: none;
                  scrollbar-width: none;
                }
                .scrollbar-hide::-webkit-scrollbar {
                  display: none;
                }
              `}</style>
              {messages.map((msg) => (
                <div 
                  key={msg.id}
                  className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}
                >
                  <div className={`max-w-[80%] rounded-lg p-3 ${
                    msg.type === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-foreground'
                  }`}>
                    <div className="flex items-start gap-2">
                      {msg.type === 'ai' && <span className="text-lg">🤖</span>}
                      {msg.type === 'ai' ? (
                        <div className="text-sm prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-em:text-foreground prose-code:text-foreground prose-pre:text-foreground prose-blockquote:text-foreground prose-li:text-foreground">
                          <ReactMarkdown 
                            components={{
                              p: ({ children }) => <p className="mb-1 last:mb-0 text-sm">{children}</p>,
                              h1: ({ children }) => <h1 className="text-base font-bold mb-1">{children}</h1>,
                              h2: ({ children }) => <h2 className="text-sm font-bold mb-1">{children}</h2>,
                              h3: ({ children }) => <h3 className="text-xs font-bold mb-1">{children}</h3>,
                              ul: ({ children }) => <ul className="list-disc list-inside mb-1 space-y-0.5 text-sm">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal list-inside mb-1 space-y-0.5 text-sm">{children}</ol>,
                              li: ({ children }) => <li className="text-sm">{children}</li>,
                              code: ({ children, className }) => {
                                const isInline = !className;
                                if (isInline) {
                                  return <code className="bg-muted-foreground/20 px-1 py-0.5 rounded text-xs font-mono text-primary border border-border/50">{children}</code>;
                                }
                                return <code className="text-xs font-mono">{children}</code>;
                              },
                              pre: ({ children }) => {
                                const [copied, setCopied] = React.useState(false);
                                
                                // Extract code content and language
                                const codeElement = children as any;
                                const className = codeElement?.props?.className || '';
                                const language = className.replace('language-', '') || 'text';
                                const codeContent = codeElement?.props?.children || '';

                                const handleCopy = async () => {
                                  try {
                                    await navigator.clipboard.writeText(codeContent);
                                    setCopied(true);
                                    setTimeout(() => {
                                      setCopied(false);
                                    }, 2000);
                                  } catch (error) {
                                    console.error('Failed to copy code:', error);
                                  }
                                };

                                return (
                                  <div className="relative mb-2">
                                    <SyntaxHighlighter
                                      language={language}
                                      style={oneDark}
                                      customStyle={{
                                        margin: 0,
                                        borderRadius: '0.5rem',
                                        border: '1px solid hsl(var(--border))',
                                        fontSize: '0.75rem',
                                        background: 'hsl(var(--card))',
                                        scrollbarWidth: 'none',
                                        msOverflowStyle: 'none',
                                        padding: '0.75rem',
                                      }}
                                      codeTagProps={{
                                        style: {
                                          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                                        }
                                      }}
                                    >
                                      {codeContent}
                                    </SyntaxHighlighter>
                                    <button
                                      onClick={handleCopy}
                                      className="absolute top-1.5 right-1.5 p-1 rounded-md bg-muted/50 hover:bg-muted border border-border/50 transition-colors duration-200 text-muted-foreground hover:text-foreground"
                                      title={copied ? "Copied!" : "Copy code"}
                                    >
                                      {copied ? (
                                        <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                      ) : (
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                      )}
                                    </button>
                                  </div>
                                );
                              },
                              blockquote: ({ children }) => <blockquote className="border-l-2 border-primary/30 pl-2 italic text-sm mb-1 bg-muted/30 py-1 rounded-r">{children}</blockquote>,
                              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                              em: ({ children }) => <em className="italic">{children}</em>,
                            }}
                          >
                            {msg.message}
                          </ReactMarkdown>
                        </div>
                      ) : (
                      <div className="whitespace-pre-line text-sm">{msg.message}</div>
                      )}
                      {msg.type === 'user' && <span className="text-lg">👤</span>}
                    </div>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start animate-in slide-in-from-bottom-2">
                  <div className="max-w-[80%] bg-muted text-foreground rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <span className="text-lg">🤖</span>
                      <div className="text-sm">
                        <div className="text-sm prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-em:text-foreground prose-code:text-foreground prose-pre:text-foreground prose-blockquote:text-foreground prose-li:text-foreground">
                          <ReactMarkdown 
                            components={{
                              p: ({ children }) => <p className="mb-1 last:mb-0 text-sm">{children}</p>,
                              h1: ({ children }) => <h1 className="text-base font-bold mb-1">{children}</h1>,
                              h2: ({ children }) => <h2 className="text-sm font-bold mb-1">{children}</h2>,
                              h3: ({ children }) => <h3 className="text-xs font-bold mb-1">{children}</h3>,
                              ul: ({ children }) => <ul className="list-disc list-inside mb-1 space-y-0.5 text-sm">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal list-inside mb-1 space-y-0.5 text-sm">{children}</ol>,
                              li: ({ children }) => <li className="text-sm">{children}</li>,
                              code: ({ children, className }) => {
                                const isInline = !className;
                                if (isInline) {
                                  return <code className="bg-muted-foreground/20 px-1 py-0.5 rounded text-xs font-mono text-primary border border-border/50">{children}</code>;
                                }
                                return <code className="text-xs font-mono">{children}</code>;
                              },
                              pre: ({ children }) => {
                                const [copied, setCopied] = React.useState(false);
                                
                                // Extract code content and language
                                const codeElement = children as any;
                                const className = codeElement?.props?.className || '';
                                const language = className.replace('language-', '') || 'text';
                                const codeContent = codeElement?.props?.children || '';

                                const handleCopy = async () => {
                                  try {
                                    await navigator.clipboard.writeText(codeContent);
                                    setCopied(true);
                                    setTimeout(() => {
                                      setCopied(false);
                                    }, 2000);
                                  } catch (error) {
                                    console.error('Failed to copy code:', error);
                                  }
                                };

                                return (
                                  <div className="relative mb-2">
                                    <SyntaxHighlighter
                                      language={language}
                                      style={oneDark}
                                      customStyle={{
                                        margin: 0,
                                        borderRadius: '0.5rem',
                                        border: '1px solid hsl(var(--border))',
                                        fontSize: '0.75rem',
                                        background: 'hsl(var(--card))',
                                        scrollbarWidth: 'none',
                                        msOverflowStyle: 'none',
                                        padding: '0.75rem',
                                      }}
                                      codeTagProps={{
                                        style: {
                                          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                                        }
                                      }}
                                    >
                                      {codeContent}
                                    </SyntaxHighlighter>
                                    <button
                                      onClick={handleCopy}
                                      className="absolute top-1.5 right-1.5 p-1 rounded-md bg-muted/50 hover:bg-muted border border-border/50 transition-colors duration-200 text-muted-foreground hover:text-foreground"
                                      title={copied ? "Copied!" : "Copy code"}
                                    >
                                      {copied ? (
                                        <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                      ) : (
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                      )}
                                    </button>
                                  </div>
                                );
                              },
                              blockquote: ({ children }) => <blockquote className="border-l-2 border-primary/30 pl-2 italic text-sm mb-1 bg-muted/30 py-1 rounded-r">{children}</blockquote>,
                              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                              em: ({ children }) => <em className="italic">{children}</em>,
                            }}
                          >
                        {typingMessage}
                          </ReactMarkdown>
                        </div>
                        <span className="animate-pulse">|</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Features Sidebar */}
          <div className="w-72 flex flex-col space-y-3 overflow-y-auto scrollbar-hide">
            <style jsx>{`
              .scrollbar-hide {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
              .scrollbar-hide::-webkit-scrollbar {
                display: none;
              }
            `}</style>
            
            <Card className="p-3 flex-shrink-0">
              <h3 className="font-semibold mb-2 flex items-center gap-2 text-sm">
                <span className="text-base">⚡</span>
                Real-time Features
              </h3>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Instant responses</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span>Context awareness</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                  <span>Helpful suggestions</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                  <span>Creative solutions</span>
                </div>
              </div>
            </Card>
            
            <Card className="p-3 flex-shrink-0">
              <h3 className="font-semibold mb-2 flex items-center gap-2 text-sm">
                <span className="text-base">🎯</span>
                AI Capabilities
              </h3>
              <div className="space-y-2 text-xs">
                <div className="bg-muted/50 rounded p-2">
                  <div className="font-medium text-xs">Understanding Context</div>
                  <div className="text-muted-foreground text-xs">Remembers conversation flow</div>
                </div>
                <div className="bg-muted/50 rounded p-2">
                  <div className="font-medium text-xs">Creative Planning</div>
                  <div className="text-muted-foreground text-xs">Generates detailed ideas</div>
                </div>
                <div className="bg-muted/50 rounded p-2">
                  <div className="font-medium text-xs">Helpful Resources</div>
                  <div className="text-muted-foreground text-xs">Provides practical solutions</div>
                </div>
              </div>
            </Card>
            
            <Card className="p-3 flex-shrink-0">
              <h3 className="font-semibold mb-2 flex items-center gap-2 text-sm">
                <span className="text-base">💯</span>
                Demo Stats
              </h3>
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="bg-muted/50 rounded p-2">
                  <div className="font-bold text-primary text-sm">{messages.length}</div>
                  <div className="text-muted-foreground text-xs">Messages</div>
                </div>
                <div className="bg-muted/50 rounded p-2">
                  <div className="font-bold text-primary text-sm">
                    {isTyping ? '⚡' : '✓'}
                  </div>
                  <div className="text-muted-foreground text-xs">Status</div>
                </div>
                <div className="bg-muted/50 rounded p-2">
                  <div className="font-bold text-primary text-sm">
                    {isPlaying ? '🔴' : '🟢'}
                  </div>
                  <div className="text-muted-foreground text-xs">Demo</div>
                </div>
                <div className="bg-muted/50 rounded p-2">
                  <div className="font-bold text-primary text-sm">AI</div>
                  <div className="text-muted-foreground text-xs">Mode</div>
                </div>
              </div>
            </Card>
            
            <Card className="p-3 flex-shrink-0">
              <h3 className="font-semibold mb-2 flex items-center gap-2 text-sm">
                <span className="text-base">🚀</span>
                Performance
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span>Response Time</span>
                  <span className="text-primary font-medium">0.3s</span>
                </div>
                <div className="flex justify-between">
                  <span>Accuracy</span>
                  <span className="text-primary font-medium">99.9%</span>
                </div>
                <div className="flex justify-between">
                  <span>Uptime</span>
                  <span className="text-primary font-medium">24/7</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
        
        <div className="flex justify-center gap-4 pt-4 border-t flex-shrink-0">
          <Button onClick={onClose} variant="outline">
            Close Demo
          </Button>
          <Button onClick={() => window.location.href = '/dashboard'}>
            Try ChatGenius Now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 