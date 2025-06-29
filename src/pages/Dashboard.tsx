import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { LogOut, MessageSquare, Sparkles, Send, Plus, Bot, User, Trash2, ArrowUpRight, ChevronLeft, ChevronRight, Search, X, MoreHorizontal, Bookmark, BookmarkMinus, CircleDot, CircleSlash, CircleEllipsis, CircleX, Target, RotateCcw, Zap, Users, Square, SquareCode, Download, Mic, MicOff, Pause, Play, Volume2, Image as ImageIcon, FileText } from 'lucide-react';
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

import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { geminiService } from '@/lib/gemini';
import { CharacterModal, CharacterConfig } from '@/components/ui/character-modal';
import { CharacterService, Character, generateSystemInstruction } from '@/lib/characters';
import { MessageService } from '@/lib/messages';
import ReactMarkdown from 'react-markdown';
import { jsPDF } from 'jspdf';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { SystemInstructionModal } from '@/components/ui/system-instruction-modal';
import { ChallengeModal, ChallengeConfig } from '@/components/ui/challenge-modal';
import { CharacterHubModal } from '@/components/ui/character-hub-modal';
import { toast } from '@/hooks/use-toast';
import logoImage from '@/assets/logo.png';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  character?: Character;
}

// Create default character
const createDefaultCharacter = (): Character => ({
  id: 'default-ai',
  user_id: 'default',
  name: 'AI Assistant',
  description: 'A helpful and knowledgeable AI assistant ready to help with any questions or tasks.',
  voice_tone: 'casual',
  mood: 'friendly',
  skills: ['general knowledge', 'problem solving', 'conversation'],
  emoji: '🤖',
  is_public: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

// Helper function to determine if a character is adopted
const isAdoptedCharacter = (character: Character | undefined, userId: string | undefined): boolean => {
  if (!character || !userId || character.id === 'default-ai') return false;
  return character.user_id !== userId;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loadingCharacters, setLoadingCharacters] = useState(true);
  const [pinnedCharacters, setPinnedCharacters] = useState<Set<string>>(new Set());

  const [isCharacterModalOpen, setIsCharacterModalOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const charactersLoadedRef = useRef(false);
  const [isSystemInstructionModalOpen, setIsSystemInstructionModalOpen] = useState(false);
  const [systemInstruction, setSystemInstruction] = useState('');
  const [defaultSystemInstruction, setDefaultSystemInstruction] = useState('');
  const [deleteType, setDeleteType] = useState<'chat' | 'character' | 'challenge' | null>(null);
  const [characterToDelete, setCharacterToDelete] = useState<string | null>(null);
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
  const [isCharacterHubModalOpen, setIsCharacterHubModalOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  const [readingMessageId, setReadingMessageId] = useState<string | null>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [sentViaSpeech, setSentViaSpeech] = useState(false);
  
  // Voice settings
  const [voiceSettings, setVoiceSettings] = useState({
    language: localStorage.getItem('voiceSettings') ? JSON.parse(localStorage.getItem('voiceSettings')!).language : 'en-US',
    pitch: 1,
    rate: 1
  });
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Initialize voice settings
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    // Load saved settings from localStorage
    const savedSettings = localStorage.getItem('voiceSettings');
    if (savedSettings) {
      setVoiceSettings(JSON.parse(savedSettings));
    }

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Save voice settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('voiceSettings', JSON.stringify(voiceSettings));
  }, [voiceSettings]);

  // Speech synthesis functions - defined early to avoid hoisting issues
  const startReading = (messageId: string, content: string) => {
    // Stop any existing reading
    stopReading();
    
    const utterance = new SpeechSynthesisUtterance(content);
    
    // Apply voice settings
    utterance.lang = voiceSettings.language;
    utterance.pitch = voiceSettings.pitch;
    utterance.rate = voiceSettings.rate;
    
    // Try to find a voice for the selected language
    const voice = availableVoices.find(v => v.lang.startsWith(voiceSettings.language));
    if (voice) {
      utterance.voice = voice;
    }
    
    utterance.onstart = () => {
      setReadingMessageId(messageId);
    };
    
    utterance.onend = () => {
      setReadingMessageId(null);
      speechSynthesisRef.current = null;
    };
    
    utterance.onerror = () => {
      setReadingMessageId(null);
      speechSynthesisRef.current = null;
    };
    
    speechSynthesisRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const stopReading = () => {
    if (speechSynthesisRef.current) {
      window.speechSynthesis.cancel();
      speechSynthesisRef.current = null;
    }
    setReadingMessageId(null);
  };

  // Load characters from database
  const loadCharacters = useCallback(async () => {
    if (charactersLoadedRef.current) return; // Prevent multiple loads
    
    try {
      setLoadingCharacters(true);
      const userCharacters = await CharacterService.getUserCharacters();
      
      // Also load character references
      const referencedCharacters = await CharacterService.getUserCharacterReferences();
      
      // Create default character and add it to the top
      const defaultCharacter = createDefaultCharacter();
      const allCharacters = [defaultCharacter, ...userCharacters, ...referencedCharacters];
      setCharacters(allCharacters);
      
      // Load default AI messages
      const defaultAIMessages = await MessageService.getDefaultAIMessages();
      const formattedDefaultAIMessages = defaultAIMessages.map(msg => ({
        id: msg.id,
        content: msg.content,
        sender: msg.sender,
        timestamp: new Date(msg.created_at),
      }));
      
      // Convert characters to chats format
      const characterChats: Chat[] = allCharacters.map(char => ({
        id: char.id,
        title: char.name,
        messages: char.id === 'default-ai' ? formattedDefaultAIMessages : [],
        createdAt: new Date(char.created_at),
        character: char,
      }));
      
      setChats(characterChats);
      
      // Set default character as current if none selected
      if (characterChats.length > 0 && !currentChat) {
        setCurrentChat(characterChats[0]); // This will be the default character
        if (characterChats[0].character) {
          if (characterChats[0].id === 'default-ai') {
            // For default AI, use the saved system instruction if available
            const savedInstruction = localStorage.getItem('defaultSystemInstruction');
            if (savedInstruction) {
              setDefaultSystemInstruction(savedInstruction);
              setSystemInstruction(savedInstruction);
              geminiService.startNewChat(savedInstruction);
            } else {
              // Start with empty instruction for default character
              setDefaultSystemInstruction('');
              setSystemInstruction('');
              geminiService.startNewChat('');
            }
          } else {
            // For custom characters, use their generated instruction
            const systemInstruction = generateSystemInstruction(characterChats[0].character);
            setSystemInstruction(systemInstruction);
            geminiService.startNewChat(systemInstruction);
          }
        }
      }
      
      charactersLoadedRef.current = true; // Mark as loaded
    } catch (error) {
      console.error('Error loading characters:', error);
    } finally {
      setLoadingCharacters(false);
    }
  }, []); // Remove all dependencies to prevent re-loading

  useEffect(() => {
    if (user && !charactersLoadedRef.current) { // Only load if not already loaded
      loadCharacters();
    }
  }, [user, loadCharacters]);

  // Load pinned characters from localStorage
  useEffect(() => {
    const savedPinned = localStorage.getItem('pinnedCharacters');
    if (savedPinned) {
      try {
        const pinnedArray = JSON.parse(savedPinned);
        setPinnedCharacters(new Set(pinnedArray));
      } catch (error) {
        console.error('Error loading pinned characters:', error);
      }
    }
  }, []);

  // Save pinned characters to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('pinnedCharacters', JSON.stringify(Array.from(pinnedCharacters)));
  }, [pinnedCharacters]);

  // Load system instruction from localStorage
  useEffect(() => {
    const savedInstruction = localStorage.getItem('defaultSystemInstruction');
    if (savedInstruction) {
      setDefaultSystemInstruction(savedInstruction);
      setSystemInstruction(savedInstruction);
      // Only set the default instruction if we're using the default AI
      if (!currentChat?.character) {
        geminiService.setSystemInstruction(savedInstruction);
      }
    }
  }, [currentChat?.character]);

  // Save system instruction to localStorage and update state
  const handleSaveSystemInstruction = (instruction: string) => {
    setDefaultSystemInstruction(instruction);
    setSystemInstruction(instruction);
    localStorage.setItem('defaultSystemInstruction', instruction);
    
    // Always start a new chat with the updated instruction for default AI
    if (currentChat?.id === 'default-ai') {
      geminiService.startNewChat(instruction);
      
      // Clear messages from the UI and database
      deleteChatMessages(currentChat.id);
    }
  };

  const handleLogout = async () => {
    // Stop any ongoing speech synthesis
    stopReading();
    await signOut();
    // Clear system instruction from localStorage on logout
    localStorage.removeItem('defaultSystemInstruction');
    navigate('/');
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (user?.user_metadata?.name) {
      return user.user_metadata.name
        .split(' ')
        .map((name: string) => name[0])
        .join('')
        .toUpperCase();
    }
    return user?.email?.[0]?.toUpperCase() || 'U';
  };

  // Get display name
  const getDisplayName = () => {
    return user?.user_metadata?.name || user?.email || 'User';
  };

  const createNewCharacter = useCallback(() => {
    setEditingCharacter(null);
    setIsCharacterModalOpen(true);
  }, []);

  const editCharacter = useCallback((character: Character) => {
    setEditingCharacter(character);
    setIsCharacterModalOpen(true);
  }, []);

  const handleCreateCharacter = async (characterConfig: CharacterConfig) => {
    try {
      setIsLoading(true);
      
      if (editingCharacter) {
        // Update existing character
        const updatedCharacter = await CharacterService.updateCharacter({
          id: editingCharacter.id,
          name: characterConfig.name,
          description: characterConfig.description,
          voice_tone: characterConfig.voice_tone,
          mood: characterConfig.mood,
          skills: characterConfig.skills,
          emoji: characterConfig.emoji,
          is_public: characterConfig.is_public,
        });

        // Update local state
        const updatedChat: Chat = {
          id: updatedCharacter.id,
          title: updatedCharacter.name,
          messages: currentChat?.id === updatedCharacter.id ? currentChat.messages : [],
          createdAt: new Date(updatedCharacter.created_at),
          character: updatedCharacter,
        };

        // Update chats
        setChats(prevChats => 
          prevChats.map(chat => 
            chat.id === updatedCharacter.id ? updatedChat : chat
          )
        );

        // Update characters
        setCharacters(prevCharacters => 
          prevCharacters.map(char => 
            char.id === updatedCharacter.id ? updatedCharacter : char
          )
        );

        // Update current chat if it's the one being edited
        if (currentChat?.id === updatedCharacter.id) {
          setCurrentChat(updatedChat);
          // Update system instruction for the updated character
          const characterInstruction = generateSystemInstruction(updatedCharacter);
          setSystemInstruction(characterInstruction);
          geminiService.startNewChat(characterInstruction); // Start new chat with updated instruction
        }

        // Clear editing state
        setEditingCharacter(null);
      } else {
        // Create new character
        const newCharacter = await CharacterService.createCharacter({
          name: characterConfig.name,
          description: characterConfig.description,
          voice_tone: characterConfig.voice_tone,
          mood: characterConfig.mood,
          skills: characterConfig.skills,
          emoji: characterConfig.emoji,
          is_public: characterConfig.is_public,
        });

        // Add to local state without reloading all characters
        const newChat: Chat = {
          id: newCharacter.id,
          title: newCharacter.name,
          messages: [],
          createdAt: new Date(newCharacter.created_at),
          character: newCharacter,
        };

        // Add new chat after default character (at index 1)
        setChats(prevChats => {
          const defaultChat = prevChats[0];
          const otherChats = prevChats.slice(1);
          return [defaultChat, newChat, ...otherChats];
        });
        
        // Add new character after default character (at index 1)
        setCharacters(prevCharacters => {
          const defaultChar = prevCharacters[0];
          const otherChars = prevCharacters.slice(1);
          return [defaultChar, newCharacter, ...otherChars];
        });
        
        // Set as current chat and update system instruction
        setCurrentChat(newChat);
        const characterInstruction = generateSystemInstruction(newCharacter);
        setSystemInstruction(characterInstruction);
        geminiService.startNewChat(characterInstruction); // Start new chat with instruction
      }
    } catch (error) {
      console.error('Error saving character:', error);
      // You might want to show a toast notification here
    } finally {
      setIsLoading(false);
    }
  };

  // Load messages for a character
  const loadMessages = useCallback(async (characterId: string) => {
    try {
      setIsLoadingMessages(true);
      let messages;
      if (characterId === 'default-ai') {
        messages = await MessageService.getDefaultAIMessages();
      } else {
        messages = await MessageService.getMessages(characterId);
      }
      const formattedMessages = messages.map(msg => ({
        id: msg.id,
        content: msg.content,
        sender: msg.sender,
        timestamp: new Date(msg.created_at),
      }));
      return formattedMessages;
    } catch (error) {
      console.error('Error loading messages:', error);
      return [];
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  // Modify the character click handler
  const handleCharacterClick = useCallback(async (chat: Chat) => {
    if (chat.id === 'default-ai') {
      setIsSystemInstructionModalOpen(true);
    } else if (chat.character) {
      editCharacter(chat.character);
      // Load messages when clicking a character
      const messages = await loadMessages(chat.id);
      setChats(prevChats => 
        prevChats.map(prevChat => 
          prevChat.id === chat.id ? { ...prevChat, messages } : prevChat
        )
      );
    }
  }, [editCharacter, loadMessages]);

  const deleteChat = async (chatId: string) => {
    if (chatId === 'default-ai') return;
    
    // Stop any ongoing speech synthesis when deleting chat/character
    stopReading();
    
    try {
      await CharacterService.deleteCharacter(chatId);
      
      setChats(prevChats => {
        const remainingChats = prevChats.filter(chat => chat.id !== chatId);
        
        if (currentChat?.id === chatId) {
          const newCurrentChat = remainingChats.length > 0 ? remainingChats[0] : null;
          setCurrentChat(newCurrentChat);
          
          // Update system instruction when switching to a new chat after deletion
          if (newCurrentChat) {
            if (newCurrentChat.id === 'default-ai') {
              // For default AI, use the saved system instruction if available
              const savedInstruction = localStorage.getItem('defaultSystemInstruction');
              if (savedInstruction) {
                setSystemInstruction(savedInstruction);
                geminiService.startNewChat(savedInstruction);
              } else {
                // Start with empty instruction for default character
                setSystemInstruction('');
                geminiService.startNewChat('');
              }
            } else if (newCurrentChat.character) {
              // For custom characters, use their generated instruction
              const characterInstruction = generateSystemInstruction(newCurrentChat.character);
              setSystemInstruction(characterInstruction);
              geminiService.startNewChat(characterInstruction);
            }
          }
        }
        
        return remainingChats;
      });
      
      setCharacters(prevCharacters => prevCharacters.filter(char => char.id !== chatId));
    } catch (error) {
      console.error('Error deleting character:', error);
    }
  };

  // Add new function to delete chat messages
  const deleteChatMessages = async (chatId: string) => {
    // Stop any ongoing speech synthesis when deleting chat messages
    stopReading();
    
    try {
      // Delete messages from the database
      if (chatId === 'default-ai') {
        await MessageService.deleteDefaultAIMessages();
      } else {
        await MessageService.deleteMessages(chatId);
      }
      
      // Update local state to clear messages
      setChats(prevChats => 
        prevChats.map(chat => 
          chat.id === chatId ? { ...chat, messages: [] } : chat
        )
      );
      
      if (currentChat?.id === chatId) {
        setCurrentChat(prev => prev ? { ...prev, messages: [] } : null);
      }
    } catch (error) {
      console.error('Error deleting chat messages:', error);
    }
  };

  // Modify sendMessage to sync with Supabase
  const sendMessage = async () => {
    if ((!message.trim() && !selectedImage) || !currentChat || !isGeminiConfigured) return;
    const wasSentViaSpeech = sentViaSpeech;
    
          let messageContent = message.trim();
      if (selectedImage) {
        if (selectedImage.type === 'application/pdf') {
          messageContent = `{PDF}${messageContent || 'No caption provided'}`;
        } else {
          messageContent = `{IMAGE}${messageContent || 'No caption provided'}`;
        }
      }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageContent,
      sender: 'user',
      timestamp: new Date(),
    };

    const updatedChat = {
      ...currentChat,
      messages: [...currentChat.messages, userMessage],
    };

    setChats(chats.map(chat => chat.id === currentChat.id ? updatedChat : chat));
    setCurrentChat(updatedChat);
    setMessage('');
    setSentViaSpeech(false);
    setIsLoading(true);

    try {
      // Save user message to Supabase (skip for challenge chats)
      if (currentChat.id === 'default-ai') {
        await MessageService.createDefaultAIMessage({
          content: userMessage.content,
          sender: 'user',
        });
      } else if (!currentChat.id.startsWith('challenge_')) {
        await MessageService.createMessage({
          character_id: currentChat.id,
          content: userMessage.content,
          sender: 'user',
        });
      }

      // Get response from Gemini API
      let botResponse;
      if (selectedImage) {
        if (selectedImage.type === 'application/pdf') {
          botResponse = await geminiService.handlePDFMessage(selectedImage, message.trim());
        } else {
          botResponse = await geminiService.sendImageMessage(selectedImage, message.trim());
        }
        setSelectedImage(null); // Clear the selected image after sending
      } else {
        botResponse = await geminiService.sendMessage(message.trim());
      }
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: botResponse,
        sender: 'bot',
        timestamp: new Date(),
      };

      // Save bot message to Supabase (skip for challenge chats)
      if (currentChat.id === 'default-ai') {
        await MessageService.createDefaultAIMessage({
          content: botMessage.content,
          sender: 'bot',
        });
      } else if (!currentChat.id.startsWith('challenge_')) {
        // Only save to database for regular character chats, not challenge chats
        await MessageService.createMessage({
          character_id: currentChat.id,
          content: botMessage.content,
          sender: 'bot',
        });
      }

      const finalChat = {
        ...updatedChat,
        messages: [...updatedChat.messages, botMessage],
      };

      setChats(chats.map(chat => chat.id === currentChat.id ? finalChat : chat));
      setCurrentChat(finalChat);

      // Auto-start reading if the message was sent via speech-to-text
      if (wasSentViaSpeech) {
        // Small delay to ensure the message is rendered before starting to read
        setTimeout(() => {
          startReading(botMessage.id, botMessage.content);
        }, 100);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: error instanceof Error ? error.message : 'An error occurred while getting the response.',
        sender: 'bot',
        timestamp: new Date(),
      };

      const finalChat = {
        ...updatedChat,
        messages: [...updatedChat.messages, errorMessage],
      };

      setChats(chats.map(chat => chat.id === currentChat.id ? finalChat : chat));
      setCurrentChat(finalChat);

      // Auto-start reading error message if the message was sent via speech-to-text
      if (wasSentViaSpeech) {
        setTimeout(() => {
          startReading(errorMessage.id, errorMessage.content);
        }, 100);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Load messages when switching characters
  useEffect(() => {
    if (currentChat && currentChat.id !== 'default-ai' && !currentChat.id.startsWith('challenge_')) {
      loadMessages(currentChat.id).then(messages => {
        if (messages) {
          setChats(prevChats => 
            prevChats.map(chat => 
              chat.id === currentChat.id ? { ...chat, messages } : chat
            )
          );
          setCurrentChat(prev => prev ? { ...prev, messages } : null);
        }
      });
    }
  }, [currentChat?.id, loadMessages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      clearSearch();
    }
  };

  const togglePinCharacter = (characterId: string) => {
    setPinnedCharacters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(characterId)) {
        newSet.delete(characterId);
      } else {
        newSet.add(characterId);
      }
      return newSet;
    });
  };

  // Filter chats based on search query and sort by pinned status
  const filteredChats = chats.filter(chat => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    
    // Search in chat title
    if (chat.title.toLowerCase().includes(query)) return true;
    
    // Search in character description
    if (chat.character?.description?.toLowerCase().includes(query)) return true;
    
    // Search in message content
    return chat.messages.some(message => 
      message.content.toLowerCase().includes(query)
    );
  }).sort((a, b) => {
    // Sort pinned characters first, then by creation date
    const aPinned = pinnedCharacters.has(a.id);
    const bPinned = pinnedCharacters.has(b.id);
    
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    
    // If both have same pinned status, sort by creation date (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Add a new function to handle character switching
  const handleCharacterSwitch = useCallback((chat: Chat) => {
    // Stop any ongoing speech synthesis when switching characters
    stopReading();
    
    setCurrentChat(chat);
    
    if (chat.id.startsWith('challenge_')) {
      return;
    }
    
    if (chat.id === 'default-ai') {
      const savedInstruction = localStorage.getItem('defaultSystemInstruction');
      if (savedInstruction) {
        setSystemInstruction(savedInstruction);
        geminiService.startNewChat(savedInstruction);
      } else {
        const defaultInstruction = generateSystemInstruction(chat.character!);
        setSystemInstruction(defaultInstruction);
        geminiService.startNewChat(defaultInstruction);
      }
    } else if (chat.character) {
      const characterInstruction = generateSystemInstruction(chat.character);
      setSystemInstruction(characterInstruction);
      geminiService.startNewChat(characterInstruction);
    }
  }, []);

  const toggleSearch = () => {
    setIsSearching(!isSearching);
    if (isSearching) {
      setSearchQuery('');
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setIsSearching(false);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K to start text-to-speech for last bot message
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // Find the last bot message
        const lastBotMessage = currentChat?.messages
          .filter(msg => msg.sender === 'bot')
          .slice(-1)[0];
        
        if (lastBotMessage) {
          if (readingMessageId === lastBotMessage.id) {
            stopReading();
          } else {
            startReading(lastBotMessage.id, lastBotMessage.content);
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentChat?.messages, readingMessageId]);

  // Check if Gemini API key is configured
  const isGeminiConfigured = !!import.meta.env.VITE_GEMINI_API_KEY;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChat?.messages]);

  // Reset textarea height when message is cleared
  useEffect(() => {
    if (!message.trim()) {
      const textarea = document.querySelector('textarea[placeholder*="Spill your thoughts"]') as HTMLTextAreaElement;
      if (textarea) {
        textarea.style.height = '3.4rem';
      }
    }
  }, [message]);

  // Add function to restart challenge
  const handleRestartChallenge = (challengeId: string) => {
    const challenge = chats.find(chat => chat.id === challengeId);
    if (!challenge) return;

    // Clear messages and restart the challenge
    const restartedChallenge = {
      ...challenge,
      messages: [],
    };

    // Update chats
    setChats(prevChats => 
      prevChats.map(chat => 
        chat.id === challengeId ? restartedChallenge : chat
      )
    );

    // Update current chat if it's the one being restarted
    if (currentChat?.id === challengeId) {
      setCurrentChat(restartedChallenge);
    }

    // The challenge system instruction should already be set from when it was created
    // We just need to start a new chat session with the same instruction
    if (challenge.character) {
      // For challenges, we need to reconstruct the system instruction
      // This is a simplified version - you might want to store the original challenge config
      const challengeSystemInstruction = `You are an AI exam/test creator and evaluator. Continue the challenge that was previously started.`;
      geminiService.startNewChat(challengeSystemInstruction);
      
      // Send initial message to restart the challenge
      setTimeout(async () => {
        try {
          setIsLoading(true);
          const response = await geminiService.sendMessage("Restart the challenge. Present the first question again.");
          
          const newBotMessage: Message = {
            id: Date.now().toString(),
            content: response,
            sender: 'bot',
            timestamp: new Date(),
          };

          setChats(prevChats => 
            prevChats.map(chat => 
              chat.id === challengeId ? { ...chat, messages: [newBotMessage] } : chat
            )
          );

          if (currentChat?.id === challengeId) {
            setCurrentChat(prev => prev ? { ...prev, messages: [newBotMessage] } : null);
          }
        } catch (error) {
          console.error('Error restarting challenge:', error);
        } finally {
          setIsLoading(false);
        }
      }, 100);
    }

    toast({
      title: "Challenge Restarted",
      description: "The challenge has been reset and is ready to begin again.",
    });
  };

  // Modify delete functions to work with confirmation
  const handleDeleteClick = (type: 'chat' | 'character' | 'challenge', chatId: string) => {
    setDeleteType(type);
    setCharacterToDelete(chatId);
  };

  const handleDeleteConfirm = async () => {
    if (!characterToDelete) return;

    try {
      if (deleteType === 'chat') {
        await deleteChatMessages(characterToDelete);
        toast({
          title: "Conversation Cleared",
          description: "All messages have been removed from the conversation.",
        });
      } else if (deleteType === 'character') {
        // Check if it's a referenced character or a user-created one
        const isReferenced = characters.find(char => 
          char.id === characterToDelete && char.user_id !== user?.id && char.id !== 'default-ai'
        );
        
        if (isReferenced) {
          // Delete messages first
          await MessageService.deleteMessages(characterToDelete);
          // Then delete the reference
          await CharacterService.deleteCharacterReference(characterToDelete);
        } else {
          // Delete the actual character if it's user-created
          await CharacterService.deleteCharacter(characterToDelete);
        }
        
        // Remove from state
        setCharacters(prev => prev.filter(char => char.id !== characterToDelete));
        setChats(prev => prev.filter(chat => chat.id !== characterToDelete));
        
        // If the deleted character was the current chat, switch to default
        if (currentChat?.id === characterToDelete) {
          const defaultChat = chats.find(chat => chat.id === 'default-ai');
          if (defaultChat) {
            setCurrentChat(defaultChat);
            const instruction = localStorage.getItem('defaultSystemInstruction') || '';
            setSystemInstruction(instruction);
            geminiService.startNewChat(instruction);
          }
        }
        
        toast({
          title: "Assistant Removed",
          description: isReferenced 
            ? "The assistant has been unsubscribed from your directory." 
            : "The assistant has been permanently removed from the system.",
        });
      } else if (deleteType === 'challenge') {
        navigate('/');
      }
    } catch (error) {
      console.error('Error during deletion:', error);
      toast({
        title: "Error",
        description: "Failed to delete. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleteType(null);
      setCharacterToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteType(null);
    setCharacterToDelete(null);
  };

  // Helper function to read file content
  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          resolve(result);
        } else {
          reject(new Error('Failed to read file as text'));
        }
      };
      reader.onerror = () => reject(new Error('Error reading file'));
      
      if (file.type.includes('image')) {
        // For images, we'll use base64 encoding
        reader.readAsDataURL(file);
      } else {
        // For text and PDF files
        reader.readAsText(file);
      }
    });
  };

    const handleStartChallenge = async (challengeConfig: ChallengeConfig) => {
    // Stop any ongoing speech synthesis when starting challenge
    stopReading();
    
    try {
      // Generate a simple unique ID that doesn't conflict with UUID format
      const challengeId = `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create challenge character
      const challengeCharacter: Character = {
        id: challengeId,
        user_id: 'local',
        name: 'Challenge Master',
        description: `${challengeConfig.questionType} challenge with ${challengeConfig.numberOfQuestions} questions`,
        voice_tone: 'professional',
        mood: 'focused',
        skills: ['testing', 'evaluation', 'education'],
        emoji: '🎯',
        is_public: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Get challenge title
      const challengeTitle = challengeConfig.source === 'document' 
        ? `Challenge: ${challengeConfig.documentFile?.name || 'Document'}`
        : `Challenge: ${challengeConfig.topic}`;

      setIsLoading(true);
      try {
        // Get questions from Gemini
        let questionsResponse;
        if (challengeConfig.source === 'document' && challengeConfig.documentFile) {
          questionsResponse = await geminiService.handleDocumentChallenge(challengeConfig.documentFile, challengeConfig);
        } else if (challengeConfig.source === 'topic' && challengeConfig.topic) {
          questionsResponse = await geminiService.handleTopicChallenge(challengeConfig.topic, challengeConfig);
        } else {
          throw new Error('Invalid challenge configuration');
        }

        // Parse the JSON response
        let parsedQuestions;
        try {
          parsedQuestions = JSON.parse(questionsResponse);
        } catch (error) {
          console.error('Error parsing questions JSON:', error);
          throw new Error('Failed to parse questions. Please try again.');
        }

        // Validate the questions format
        if (!parsedQuestions.questions || !Array.isArray(parsedQuestions.questions)) {
          throw new Error('Invalid questions format');
        }

        // Clear any existing state and navigate to the questions page
        navigate('/questions', {
          state: {
            questions: parsedQuestions.questions,
            title: challengeTitle,
            answerTiming: challengeConfig.answerTiming,
          },
          replace: true // This will replace the current history entry
        });

        toast({
          title: "Challenge Started",
          description: `Your ${challengeConfig.questionType} challenge with ${challengeConfig.numberOfQuestions} questions has been prepared.`,
        });
        
      } catch (error) {
        console.error('Error starting challenge:', error);
        toast({
          title: "Error starting challenge",
          description: error instanceof Error ? error.message : "Could not start the challenge. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
      
    } catch (error) {
      console.error('Error processing challenge:', error);
      toast({
        title: "Error",
        description: "An error occurred while setting up the challenge.",
        variant: "destructive",
      });
    }
  };

  // Handle adopting a character from the Character Hub
  const handleAdoptCharacter = (adoptedCharacter: Character) => {
    // Create a new chat for the adopted character
    const newChat: Chat = {
      id: adoptedCharacter.id,
      title: adoptedCharacter.name,
      messages: [],
      createdAt: new Date(adoptedCharacter.created_at),
      character: adoptedCharacter,
    };

    // Add new chat after default character (at index 1)
    setChats(prevChats => {
      const defaultChat = prevChats[0];
      const otherChats = prevChats.slice(1);
      return [defaultChat, newChat, ...otherChats];
    });
    
    // Add new character after default character (at index 1)
    setCharacters(prevCharacters => {
      const defaultChar = prevCharacters[0];
      const otherChars = prevCharacters.slice(1);
      return [defaultChar, adoptedCharacter, ...otherChars];
    });
    
    // Set as current chat and update system instruction
    setCurrentChat(newChat);
    const characterInstruction = generateSystemInstruction(adoptedCharacter);
    setSystemInstruction(characterInstruction);
    geminiService.startNewChat(characterInstruction);
  };

  // Check if speech recognition is supported
  useEffect(() => {
    const supported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    setSpeechSupported(supported);
    
    if (supported) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      setupRecognition();
    }
  }, []);

  // Cleanup recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      // Stop speech synthesis on unmount
      stopReading();
    };
  }, []);

  // Setup recognition handlers
  const setupRecognition = () => {
    if (!recognitionRef.current) return;

    const recognition = recognitionRef.current;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.continuous = false; // Change to single-result mode
    recognition.interimResults = false; // Only get final results

    recognition.onresult = (event: any) => {
      const result = event.results[0];
      if (result.isFinal) {
        const transcript = result[0].transcript;
        if (transcript.trim()) {
          setMessage(prev => {
            const space = prev.trim() ? ' ' : '';
            return (prev.trim() + space + transcript.trim()).trim();
          });
          stopListening();
          setSentViaSpeech(true);
        }
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      if (isListening) {
        recognition.start(); // Restart if not manually stopped
      } else {
        setIsListening(false);
      }
    };
  };

  const startListening = () => {
    if (!speechSupported || !recognitionRef.current) return;
    
    try {
      recognitionRef.current.start();
    } catch (error) {
      if ((error as Error).message.includes('already started')) {
        stopListening();
      }
    }
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setIsListening(false);
  };

  // Add function to handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check if file is an image or PDF
      const isImage = file.type.startsWith('image/');
      const isPDF = file.type === 'application/pdf';
      
      if (!isImage && !isPDF) {
        toast({
          title: "Invalid file type",
          description: "Please select an image or PDF file.",
          variant: "destructive"
        });
        return;
      }
      
      // Check file size (max 5MB for images, 10MB for PDFs)
      const maxSize = isPDF ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
      const sizeDescription = isPDF ? "10MB" : "5MB";
      
      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: `Please select a file smaller than ${sizeDescription}.`,
          variant: "destructive"
        });
        return;
      }
      setSelectedImage(file);
    }
  };

  return (
    <div className="h-screen bg-background flex dark">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-72' : 'w-16'} bg-card border-r border-border flex flex-col h-full transition-all duration-300 overflow-hidden`}>
        {/* Top Logo and Collapse */}
        <div className={`flex items-center ${sidebarOpen ? 'justify-between px-4' : 'justify-center'} py-4 border-b border-border/30`}>
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <img src={logoImage} alt="ChatGenius Logo" className="h-6 w-6 ml-1 object-contain" />
            </div>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-muted-foreground hover:text-foreground"
            onClick={toggleSidebar}
          >
            {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>

        {/* Main Navigation */}
        <nav className={`flex flex-col gap-1 ${sidebarOpen ? 'px-2' : 'px-1'} py-4`}>
          <Button 
            variant="ghost" 
            className={`justify-${sidebarOpen ? 'start' : 'center'} gap-3 px-3 py-2 font-medium text-base rounded-lg w-full text-foreground hover:bg-muted`}
            onClick={createNewCharacter}
          >
            <MessageSquare className="h-5 w-5 text-primary" />
            {sidebarOpen && "Create Assistant"}
          </Button>
          
          {isSearching && sidebarOpen ? (
            <div className="px-3 py-2">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search assistants..."
                  className="pl-9 pr-9 h-10 text-sm rounded-full"
                  autoFocus
                  onKeyPress={handleSearchKeyPress}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground"
                  onClick={clearSearch}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <Button 
              variant="ghost" 
              className={`justify-${sidebarOpen ? 'start' : 'center'} gap-3 px-3 py-2 text-foreground font-medium text-base rounded-lg hover:bg-muted`}
              onClick={toggleSearch}
            >
              <Search className="h-5 w-5 text-primary" />
              {sidebarOpen && "Search Assistants"}
            </Button>
          )}
          
          <Button 
            variant="ghost" 
            className={`justify-${sidebarOpen ? 'start' : 'center'} gap-3 px-3 py-2 text-foreground font-medium text-base rounded-lg hover:bg-muted`}
            onClick={() => setIsChallengeModalOpen(true)}
          >
            <Target className="h-5 w-5 text-primary" />
            {sidebarOpen && "Challenge"}
          </Button>
          
          <Button 
            variant="ghost" 
            className={`justify-${sidebarOpen ? 'start' : 'center'} gap-3 px-3 py-2 text-foreground font-medium text-base rounded-lg hover:bg-muted`}
            onClick={() => setIsCharacterHubModalOpen(true)}
          >
            <Users className="h-5 w-5 text-primary" />
            {sidebarOpen && "Assistant Directory"}
          </Button>
        </nav>

        {/* Divider for minimized state */}
        {!sidebarOpen && (
          <div className="mx-2 my-2 h-[2px] bg-border/50" />
        )}

        {/* Characters Section */}
        {sidebarOpen && (
          <div className="px-4 pt-2 pb-1 text-xs text-muted-foreground font-semibold tracking-wide">
            {searchQuery.trim() ? `Search Results (${filteredChats.length})` : 'Available Assistants'}
          </div>
        )}
        <ScrollArea className="flex-1 px-2 pb-2">
          <div className="flex flex-col gap-1">
            {loadingCharacters ? (
              <div className={`px-3 py-8 text-center ${!sidebarOpen && 'px-0'}`}>
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                {sidebarOpen && <p className="text-sm text-muted-foreground">Loading assistants...</p>}
              </div>
            ) : filteredChats.length === 0 && searchQuery.trim() ? (
              sidebarOpen && (
                <div className="px-3 py-8 text-center">
                  <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No results found for "{searchQuery}"</p>
                  <p className="text-xs text-muted-foreground mt-1">Please try different search terms</p>
                </div>
              )
            ) : filteredChats.length === 0 ? (
              sidebarOpen && (
                <div className="px-3 py-8 text-center">
                  <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No assistants configured</p>
                  <p className="text-xs text-muted-foreground mt-1">Create your first AI assistant to begin</p>
                </div>
              )
            ) : (
              <>
                {/* Pinned Characters Section */}
                {!searchQuery.trim() && filteredChats.some(chat => pinnedCharacters.has(chat.id)) && sidebarOpen && (
                  <div className="px-3 pt-2 pb-1 text-xs text-muted-foreground font-semibold tracking-wide flex items-center gap-1">
                    <Bookmark className="h-3 w-3" />
                    Prioritized
                  </div>
                )}
                {filteredChats.filter(chat => pinnedCharacters.has(chat.id)).map((chat) => (
                  <div
                    key={chat.id}
                    className={`flex items-center ${sidebarOpen ? 'gap-3 px-3' : 'justify-center px-2'} py-3 rounded-lg cursor-pointer transition-colors text-foreground text-sm font-normal ${
                      currentChat?.id === chat.id ? 'bg-muted' : 'hover:bg-muted/70'
                    }`}
                    onClick={() => handleCharacterSwitch(chat)}
                  >
                    {chat.id === 'default-ai' ? (
                      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-lg">
                        🤖
                      </div>
                    ) : chat.character && (
                      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-lg">
                        {chat.character.emoji}
                      </div>
                    )}
                    {sidebarOpen && (
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium flex items-center gap-1">
                          {chat.title}
                        </div>
                        {chat.character && (
                          <div className="text-xs text-muted-foreground truncate">
                            {chat.character.skills.slice(0, 2).map(skill => {
                              const skillObj = [
                                { id: 'coding', emoji: '💻' },
                                { id: 'writing', emoji: '✍️' },
                                { id: 'math', emoji: '🔢' },
                                { id: 'science', emoji: '🔬' },
                                { id: 'cooking', emoji: '👨‍🍳' },
                                { id: 'music', emoji: '🎵' },
                                { id: 'art', emoji: '🎨' },
                                { id: 'business', emoji: '📈' },
                                { id: 'fitness', emoji: '💪' },
                                { id: 'travel', emoji: '✈️' },
                                { id: 'gaming', emoji: '🎮' },
                                { id: 'philosophy', emoji: '🤔' },
                              ].find(s => s.id === skill);
                              return skillObj?.emoji || '';
                            }).join(' ')}
                            {chat.character.skills.length > 2 && ` +${chat.character.skills.length - 2}`}
                          </div>
                        )}
                      </div>
                    )}
                    {chat.id !== 'default-ai' && currentChat?.id === chat.id && sidebarOpen && (
                      <div className="flex items-center gap-1">
                        {pinnedCharacters.has(chat.id) && (
                          <div className="flex-shrink-0">
                            <Bookmark className="h-3 w-3 text-primary" />
                          </div>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-foreground flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            {chat.id.startsWith('challenge_') ? (
                              <>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRestartChallenge(chat.id);
                                  }}
                                  className="cursor-pointer"
                                >
                                  <RotateCcw className="h-4 w-4 mr-2" />
                                  Restart
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteClick('challenge', chat.id);
                                  }}
                                  className="cursor-pointer text-destructive focus:text-destructive"
                                >
                                  <CircleX className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    togglePinCharacter(chat.id);
                                  }}
                                  className="cursor-pointer"
                                >
                                  {pinnedCharacters.has(chat.id) ? (
                                    <>
                                      <BookmarkMinus className="h-4 w-4 mr-2" />
                                      Remove Priority
                                    </>
                                  ) : (
                                    <>
                                      <Bookmark className="h-4 w-4 mr-2" />
                                      Set as Priority
                                    </>
                                  )}
                                </DropdownMenuItem>
                                {!isAdoptedCharacter(chat.character, user?.id) ? (
                                  <>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCharacterClick(chat);
                                      }}
                                      className="cursor-pointer"
                                    >
                                      <CircleEllipsis className="h-4 w-4 mr-2" />
                                      Configure Assistant
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteClick('character', chat.id);
                                      }}
                                      className="cursor-pointer text-destructive focus:text-destructive"
                                    >
                                      <CircleX className="h-4 w-4 mr-2" />
                                      Remove Assistant
                                    </DropdownMenuItem>
                                  </>
                                ) : (
                                  <>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteClick('character', chat.id);
                                      }}
                                      className="cursor-pointer text-destructive focus:text-destructive"
                                    >
                                      <CircleX className="h-4 w-4 mr-2" />
                                      Unsubscribe from Assistant
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                    {chat.id === 'default-ai' && sidebarOpen && (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        Default
                      </Badge>
                    )}
                  </div>
                ))}

                {/* Unpinned Characters Section */}
                {!searchQuery.trim() && filteredChats.some(chat => !pinnedCharacters.has(chat.id)) && sidebarOpen && (
                  <div className="px-3 pt-4 pb-1 text-xs text-muted-foreground font-semibold tracking-wide">
                    All Assistants
                  </div>
                )}
                {filteredChats.filter(chat => !pinnedCharacters.has(chat.id)).map((chat) => (
                  <div
                    key={chat.id}
                    className={`flex items-center ${sidebarOpen ? 'gap-3 px-3' : 'justify-center px-2'} py-3 rounded-lg cursor-pointer transition-colors text-foreground text-sm font-normal ${
                      currentChat?.id === chat.id ? 'bg-muted' : 'hover:bg-muted/70'
                    }`}
                    onClick={() => handleCharacterSwitch(chat)}
                  >
                    {chat.id === 'default-ai' ? (
                      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-lg">
                        🤖
                      </div>
                    ) : chat.character && (
                      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-lg">
                        {chat.character.emoji}
                      </div>
                    )}
                    {sidebarOpen && (
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium flex items-center gap-1">
                          {chat.title}
                        </div>
                        {chat.character && (
                          <div className="text-xs text-muted-foreground truncate">
                            {chat.character.skills.slice(0, 2).map(skill => {
                              const skillObj = [
                                { id: 'coding', emoji: '💻' },
                                { id: 'writing', emoji: '✍️' },
                                { id: 'math', emoji: '🔢' },
                                { id: 'science', emoji: '🔬' },
                                { id: 'cooking', emoji: '👨‍🍳' },
                                { id: 'music', emoji: '🎵' },
                                { id: 'art', emoji: '🎨' },
                                { id: 'business', emoji: '📈' },
                                { id: 'fitness', emoji: '💪' },
                                { id: 'travel', emoji: '✈️' },
                                { id: 'gaming', emoji: '🎮' },
                                { id: 'philosophy', emoji: '🤔' },
                              ].find(s => s.id === skill);
                              return skillObj?.emoji || '';
                            }).join(' ')}
                            {chat.character.skills.length > 2 && ` +${chat.character.skills.length - 2}`}
                          </div>
                        )}
                      </div>
                    )}
                    {chat.id !== 'default-ai' && currentChat?.id === chat.id && sidebarOpen && (
                      <div className="flex items-center gap-1">
                        {pinnedCharacters.has(chat.id) && (
                          <div className="flex-shrink-0">
                            <Bookmark className="h-3 w-3 text-primary" />
                          </div>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-foreground flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            {chat.id.startsWith('challenge_') ? (
                              <>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRestartChallenge(chat.id);
                                  }}
                                  className="cursor-pointer"
                                >
                                  <RotateCcw className="h-4 w-4 mr-2" />
                                  Restart
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteClick('challenge', chat.id);
                                  }}
                                  className="cursor-pointer text-destructive focus:text-destructive"
                                >
                                  <CircleX className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    togglePinCharacter(chat.id);
                                  }}
                                  className="cursor-pointer"
                                >
                                  {pinnedCharacters.has(chat.id) ? (
                                    <>
                                      <BookmarkMinus className="h-4 w-4 mr-2" />
                                      Remove Priority
                                    </>
                                  ) : (
                                    <>
                                      <Bookmark className="h-4 w-4 mr-2" />
                                      Set as Priority
                                    </>
                                  )}
                                </DropdownMenuItem>
                                {!isAdoptedCharacter(chat.character, user?.id) ? (
                                  <>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCharacterClick(chat);
                                      }}
                                      className="cursor-pointer"
                                    >
                                      <CircleEllipsis className="h-4 w-4 mr-2" />
                                      Configure Assistant
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteClick('character', chat.id);
                                      }}
                                      className="cursor-pointer text-destructive focus:text-destructive"
                                    >
                                      <CircleX className="h-4 w-4 mr-2" />
                                      Remove Assistant
                                    </DropdownMenuItem>
                                  </>
                                ) : (
                                  <>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteClick('character', chat.id);
                                      }}
                                      className="cursor-pointer text-destructive focus:text-destructive"
                                    >
                                      <CircleX className="h-4 w-4 mr-2" />
                                      Unsubscribe from Assistant
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                    {chat.id === 'default-ai' && sidebarOpen && (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        Default
                      </Badge>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        </ScrollArea>

        {/* Bottom Section */}
        <div className={`border-t border-border ${sidebarOpen ? 'px-4' : 'px-2'} pt-4 pb-6 flex flex-col gap-2`}>
          <div className={`flex items-center ${sidebarOpen ? 'gap-2' : 'justify-center'} mt-2`}>
            <div className="h-7 w-7 bg-muted rounded-full flex items-center justify-center text-xs font-medium text-foreground">
              {getUserInitials()}
            </div>
            {sidebarOpen && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate text-foreground">{getDisplayName()}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="h-14 border-b border-border/40 flex items-center justify-between px-6 relative">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {currentChat?.character && (
                <div className="w-8 h-8 flex items-center justify-center text-xl">
                  {currentChat.character.emoji}
                </div>
              )}
              <div>
                <h2 className="text-lg font-semibold">
                  {currentChat?.title || 'New Character'}
                </h2>
                {currentChat?.character && (
                  <p className="text-xs text-muted-foreground">
                    {currentChat.character.voice_tone} • {currentChat.character.mood}
                  </p>
                )}
              </div>
            </div>
            {currentChat && (
              <Badge variant="secondary" className="text-xs">
                {currentChat.messages.length} messages
              </Badge>
            )}
          </div>
          {currentChat && (
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="relative"
                    title="Voice Settings"
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72">
                  <div className="p-2 space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Language</label>
                        <span className="text-xs text-muted-foreground">
                          {new Intl.DisplayNames([voiceSettings.language], { type: 'language' }).of(voiceSettings.language)}
                        </span>
                      </div>
                      <Select
                        value={voiceSettings.language}
                        onValueChange={(value) => setVoiceSettings(prev => ({ ...prev, language: value }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a language" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {Array.from(new Set(availableVoices.map(voice => voice.lang.split('-')[0])))
                              .sort((a, b) => {
                                // Put English at the top
                                if (a === 'en') return -1;
                                if (b === 'en') return 1;
                                return new Intl.DisplayNames([a], { type: 'language' })
                                  .of(a)!
                                  .localeCompare(new Intl.DisplayNames([b], { type: 'language' }).of(b)!);
                              })
                              .map(lang => (
                                <SelectItem key={lang} value={lang}>
                                  {new Intl.DisplayNames([lang], { type: 'language' }).of(lang)}
                                </SelectItem>
                              ))
                            }
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs text-muted-foreground">Pitch</label>
                        <span className="text-xs tabular-nums">{voiceSettings.pitch.toFixed(1)}x</span>
                      </div>
                      <Slider
                        min={0.5}
                        max={2}
                        step={0.1}
                        value={[voiceSettings.pitch]}
                        onValueChange={([value]) => setVoiceSettings(prev => ({ ...prev, pitch: value }))}
                        className="w-full h-3"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs text-muted-foreground">Speed</label>
                        <span className="text-xs tabular-nums">{voiceSettings.rate.toFixed(1)}x</span>
                      </div>
                      <Slider
                        min={0.5}
                        max={2}
                        step={0.1}
                        value={[voiceSettings.rate]}
                        onValueChange={([value]) => setVoiceSettings(prev => ({ ...prev, rate: value }))}
                        className="w-full h-3"
                      />
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {currentChat.id.startsWith('challenge_') ? (
                    <>
                      <DropdownMenuItem
                        onClick={() => handleRestartChallenge(currentChat.id)}
                        className="cursor-pointer"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Restart Challenge
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick('challenge', currentChat.id)}
                        className="cursor-pointer text-destructive focus:text-destructive"
                      >
                        <CircleX className="h-4 w-4 mr-2" />
                        Delete Challenge
                      </DropdownMenuItem>
                    </>
                  ) : currentChat.id === 'default-ai' ? (
                    <>
                      <DropdownMenuItem
                        onClick={() => setIsSystemInstructionModalOpen(true)}
                        className="cursor-pointer"
                      >
                        <CircleEllipsis className="h-4 w-4 mr-2" />
                        Edit System Instruction
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick('chat', currentChat.id)}
                        className="cursor-pointer text-orange-500 focus:text-orange-500 dark:text-orange-400 dark:focus:text-orange-400"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Chat History
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      {!isAdoptedCharacter(currentChat.character, user?.id) ? (
                        <>
                          <DropdownMenuItem
                            onClick={() => handleCharacterClick(currentChat)}
                            className="cursor-pointer"
                          >
                            <CircleEllipsis className="h-4 w-4 mr-2" />
                            Edit Character
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick('chat', currentChat.id)}
                            className="cursor-pointer text-orange-500 focus:text-orange-500 dark:text-orange-400 dark:focus:text-orange-400"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Chat History
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick('character', currentChat.id)}
                            className="cursor-pointer text-destructive focus:text-destructive"
                          >
                            <CircleX className="h-4 w-4 mr-2" />
                            Delete Character
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <>
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick('chat', currentChat.id)}
                            className="cursor-pointer text-orange-500 focus:text-orange-500 dark:text-orange-400 dark:focus:text-orange-400"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Clear Chat History
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick('character', currentChat.id)}
                            className="cursor-pointer text-destructive focus:text-destructive"
                          >
                            <CircleX className="h-4 w-4 mr-2" />
                            Remove Character
                          </DropdownMenuItem>
                        </>
                      )}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1">
          <div className="max-w-5xl mx-auto space-y-5 pt-6">
            {isLoadingMessages ? (
              <div className="flex gap-4 max-w-[70%]">
                <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  {currentChat?.character?.emoji || '🤖'}
                </div>
                <div className="bg-muted rounded-2xl px-4 py-3 inline-block">
                  <div className="flex items-end gap-1">
                    <div className="w-2.5 h-2.5 bg-muted-foreground/70 rounded-full animate-bounce" style={{ animationDuration: '0.6s' }}></div>
                    <div className="w-2.5 h-2.5 bg-muted-foreground/70 rounded-full animate-bounce" style={{ animationDuration: '0.6s', animationDelay: '0.2s' }}></div>
                    <div className="w-2.5 h-2.5 bg-muted-foreground/70 rounded-full animate-bounce" style={{ animationDuration: '0.6s', animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            ) : currentChat?.messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 mt-10">
               
                {!isGeminiConfigured ? (
                  <div className="max-w-md mx-auto p-6 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 rounded-2xl backdrop-blur-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-amber-100 dark:bg-amber-900/50 rounded-full">
                        <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>
                      </div>
                      <p className="text-base font-semibold text-amber-800 dark:text-amber-200">
                        Setup Required
                      </p>
                    </div>
                    <p className="text-sm text-amber-700/90 dark:text-amber-300/90 leading-relaxed">
                      No API key? No AI sass. Check the .env file, genius 🤖
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Welcome Header */}
                    <div className="text-center mb-12">          
                      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                        {currentChat?.character ? 
                          `Hey there! I'm ${currentChat.character.name} 👋` : 
                          'Ready to chat! 🚀'
                        }
                      </h1>
                      <p className="text-slate-600 dark:text-slate-400 text-sm max-w-md mx-auto">
                        {currentChat?.character ? 
                          currentChat.character.description :
                          'Start a conversation or create a new character'
                        }
                      </p>
                    </div>

                    {/* Suggested Queries */}
                    <div className="w-full max-w-3xl mx-auto mb-12">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                  {[
                            {
                              icon: "💼",
                              title: "Business Analysis",
                              query: "Analyze current tech industry trends and opportunities"
                            },
                            {
                              icon: "💻",
                              title: "Code Review",
                              query: "Review this code for performance improvements"
                            },
                            {
                              icon: "✍️",
                              title: "Content Creation",
                              query: "Draft a blog post about AI technologies"
                            },
                            {
                              icon: "🎯",
                              title: "Project Planning",
                              query: "Create a project timeline with key milestones"
                            }
                        ].map((suggestion, index) => (
                          <Card 
                            key={index}
                            className="relative p-6 cursor-pointer transition-all duration-300 ease-out border dark:border-gray-700/60 bg-card hover:shadow-xl hover:shadow-slate-900/10 dark:hover:shadow-black/30 hover:-translate-y-1 hover:border-border hover:bg-muted backdrop-blur-sm"
                            onClick={() => {
                              setMessage(suggestion.query);
                              // Focus the input after setting the message
                              setTimeout(() => {
                                const input = document.querySelector('input[placeholder*="Type your message"]') as HTMLInputElement;
                                input?.focus();
                              }, 100);
                            }}
                          >
                            <CardContent className="p-0">
                              <div className="flex items-start gap-4">
                                <div className="flex items-center justify-center w-14 h-14 bg-muted rounded-xl border border-border group-hover:scale-110 group-hover:rotate-3 group-hover:bg-background dark:group-hover:bg-muted transition-all duration-300 ease-out shadow-sm group-hover:shadow-md">
                                  <span className="text-2xl group-hover:scale-110 transition-transform duration-300">{suggestion.icon}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-foreground mb-2 group-hover:text-foreground transition-colors duration-200">
                                    {suggestion.title}
                                  </h4>
                                  <p className="text-sm text-muted-foreground leading-relaxed group-hover:text-foreground/90 transition-colors duration-200">
                                    {suggestion.query}
                                  </p>
                                </div>
                                <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-all duration-300 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:scale-110" />
                              </div>
                              {/* Subtle hover glow effect */}
                              <div className="absolute inset-0 rounded-xl bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>

                    {/* Quick Tips */}
                    <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2.5">
                        <kbd className="px-3 py-1.5 bg-muted rounded-lg border border-border text-xs font-medium text-foreground shadow-sm">Enter</kbd>
                        <span>Send message</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="flex items-center gap-1">
                          <kbd className="px-3 py-1.5 bg-muted rounded-lg border border-border text-xs font-medium text-foreground shadow-sm">Shift</kbd>
                          <span className="text-muted-foreground">+</span>
                          <kbd className="px-3 py-1.5 bg-muted rounded-lg border border-border text-xs font-medium text-foreground shadow-sm">Enter</kbd>
                        </div>
                        <span>New line</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="flex items-center gap-1">
                          <kbd className="px-3 py-1.5 bg-muted rounded-lg border border-border text-xs font-medium text-foreground shadow-sm">⌘</kbd>
                          <span className="text-muted-foreground">+</span>
                          <kbd className="px-3 py-1.5 bg-muted rounded-lg border border-border text-xs font-medium text-foreground shadow-sm">K</kbd>
                        </div>
                        <span>Read last message</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              currentChat?.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-4 ${
                    msg.sender === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {msg.sender === 'bot' && (
                    <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                      {currentChat?.character?.emoji || '🤖'}
                    </div>
                  )}
                  
                  <div
                    className={`max-w-[70%] ${
                      msg.sender === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : readingMessageId === msg.id
                        ? 'bg-red-500/20 border-2 border-red-500/40 group'
                        : 'bg-muted group'
                    } rounded-2xl px-4 py-3 relative transition-all duration-300`}
                  >
                    {msg.sender === 'bot' ? (
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
                                return <code className="bg-muted-foreground/20 px-1.5 py-0.5 rounded text-sm font-mono text-primary border border-border/50">{children}</code>;
                              }
                              return <code className="text-sm font-mono">{children}</code>;
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
                                      fontSize: '0.875rem',
                                      background: 'hsl(var(--card))',
                                      scrollbarWidth: 'none',
                                      msOverflowStyle: 'none',
                                      padding: '1rem',
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
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <>
                        {msg.content.startsWith('{IMAGE}') || msg.content.startsWith('{PDF}') ? (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 bg-gray-300 rounded-full px-4 py-2 w-fit">
                              {msg.content.startsWith('{PDF}') ? (
                                <>
                                  <FileText className="h-5 w-5 text-blue-500" />
                                  <span className="text-sm text-gray-700 font-medium">PDF Attachment</span>
                                </>
                              ) : (
                                <>
                                  <ImageIcon className="h-5 w-5 text-blue-500" />
                                  <span className="text-sm text-gray-700 font-medium">Image Attachment</span>
                                </>
                              )}
                            </div>
                            <p className="text-sm whitespace-pre-wrap">
                              {msg.content.startsWith('{PDF}') 
                                ? msg.content.replace('{PDF}', '')
                                : msg.content.replace('{IMAGE}', '')}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        )}
                      </>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <p className="text-xs opacity-70">
                        {msg.timestamp.toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                      {msg.sender === 'bot' && (
                        <div className={`flex items-center gap-2 transition-opacity duration-200 ${
                          msg.id === currentChat?.messages[currentChat.messages.length - 1]?.id 
                            ? 'opacity-100' 
                            : 'opacity-0 group-hover:opacity-100'
                        }`}>
                          <button
                            onClick={() => {
                              if (readingMessageId === msg.id) {
                                stopReading();
                              } else {
                                startReading(msg.id, msg.content);
                              }
                            }}
                            className={`transition-colors ${
                              readingMessageId === msg.id 
                                ? 'text-red-500 hover:text-red-600' 
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                            title={readingMessageId === msg.id ? "Stop reading" : "Read aloud"}
                          >
                            {readingMessageId === msg.id ? (
                              <CircleX className="h-3 w-3" />
                            ) : (
                              <Volume2 className="h-3 w-3" />
                            )}
                          </button>
                          <button
                            onClick={async () => {
                              await navigator.clipboard.writeText(msg.content);
                              toast({
                                          title: "Content Copied",
          description: "Message content has been copied to your clipboard",
                              });
                            }}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="Copy message"
                          >
                            <Square className="h-3 w-3" />
                          </button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                className="text-muted-foreground hover:text-foreground transition-colors"
                                title="More options"
                              >
                                <ArrowUpRight className="h-3 w-3" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                onClick={async () => {
                                  try {
                                    await navigator.share({
                                      text: msg.content,
                                    });
                                  } catch (err) {
                                    // Fallback to clipboard if share is not supported
                                    await navigator.clipboard.writeText(msg.content);
                                    toast({
                                      title: "Copied!",
                                      description: "Message copied to clipboard for sharing",
                                    });
                                  }
                                }}
                                className="cursor-pointer"
                              >
                                <ArrowUpRight className="h-4 w-4 mr-2" />
                                Share
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  try {
                                    // Find the last user message before this bot message
                                    const messageIndex = currentChat?.messages.findIndex(m => m.id === msg.id) || 0;
                                    const lastUserMessage = currentChat?.messages
                                      .slice(0, messageIndex)
                                      .reverse()
                                      .find(m => m.sender === 'user');

                                    // Create a new jsPDF instance with dark theme
                                    const doc = new jsPDF({
                                      unit: 'mm',
                                      format: 'a4',
                                      orientation: 'portrait'
                                    });

                                    // Set carbon black background for entire page
                                    doc.setFillColor(12, 12, 12); // Carbon black background
                                    doc.rect(0, 0, 210, 297, 'F'); // Fill entire A4 page

                                    // Add logo and app name with proper alignment
                                    const logoSize = 8;
                                    const headerY = 20;
                                    const appNameX = 30; // Adjusted for better alignment
                                    
                                    // Add logo
                                    doc.addImage(logoImage, 'PNG', 20, headerY - (logoSize/2), logoSize, logoSize);
                                    
                                    // Add app name aligned with logo center
                                    doc.setTextColor(100, 200, 255); // Light blue for link
                                    doc.setFont("helvetica", "bold");
                                    doc.setFontSize(16);
                                    doc.textWithLink('ChatGenius', appNameX, headerY + 2, { url: window.location.origin });
                                    
                                    // Add a subtle divider line with better spacing
                                    doc.setDrawColor(60, 60, 60); // Dark gray
                                    doc.setLineWidth(0.3);
                                    doc.line(20, 30, 190, 30);

                                    // Add title (user's question) with clean styling
                                    const title = lastUserMessage?.content || 'AI Response';
                                    doc.setTextColor(255, 255, 255); // Pure white
                                    doc.setFont("helvetica", "bold");
                                    doc.setFontSize(18);
                                    const titleLines = doc.splitTextToSize(title, 170);
                                    
                                    // Add title without background
                                    let yPosition = 45;
                                    titleLines.forEach((line: string, index: number) => {
                                      doc.text(line, 20, yPosition + (index * 8));
                                    });
                                    yPosition += titleLines.length * 8 + 8; // Reduced gap

                                    // Add metadata with reduced spacing
                                    doc.setFont("helvetica", "normal");
                                    doc.setFontSize(11);
                                    doc.setTextColor(180, 180, 180); // Light gray
                                    doc.text(`Generated by: ${currentChat?.character?.name || 'AI Assistant'}`, 20, yPosition);
                                    doc.text(`Date: ${msg.timestamp.toLocaleString()}`, 20, yPosition + 8);
                                    
                                    yPosition += 25;

                                    // Process markdown content with enhanced styling
                                    const segments = msg.content.split(/(```[\s\S]*?```)/);
                                    
                                    segments.forEach((segment) => {
                                      if (segment.startsWith('```')) {
                                        // Handle code blocks with improved styling
                                        const match = segment.match(/```(\w+)?\n?([\s\S]*?)\n?```/);
                                        const language = match?.[1] || 'text';
                                        const code = match?.[2]?.trim() || segment.replace(/```/g, '').trim();
                                        
                                        if (yPosition > 260) {
                                          doc.addPage();
                                          // Set carbon black background for new page
                                          doc.setFillColor(12, 12, 12);
                                          doc.rect(0, 0, 210, 297, 'F');
                                          yPosition = 25;
                                        }
                                        
                                        const codeLines = code.split('\n');
                                        const blockHeight = Math.max(codeLines.length * 7 + 16, 24);
                                        
                                        // Add rounded code block background with better styling
                                        doc.setFillColor(25, 25, 25); // Darker gray for code blocks
                                        doc.roundedRect(15, yPosition - 8, 180, blockHeight, 6, 6, 'F');
                                        
                                        // Add subtle border
                                        doc.setDrawColor(80, 80, 80); // Medium gray border
                                        doc.setLineWidth(0.2);
                                        doc.roundedRect(15, yPosition - 8, 180, blockHeight, 6, 6, 'S');
                                        
                                        // Add language label without background
                                        if (language && language !== 'text') {
                                          doc.setTextColor(100, 200, 255); // Light blue text
                                          doc.setFont('helvetica', 'bold');
                                          doc.setFontSize(8);
                                          doc.text(language.toUpperCase(), 175, yPosition - 2);
                                        }
                                        
                                        // Add code with better font and syntax coloring
                                        doc.setFont('Courier', 'normal');
                                        doc.setFontSize(10);
                                        
                                        codeLines.forEach((line, index) => {
                                          const lineY = yPosition + 2 + (index * 7);
                                          
                                          // Enhanced syntax highlighting
                                          if (line.trim().startsWith('//') || line.trim().startsWith('#')) {
                                            // Comments - soft green
                                            doc.setTextColor(120, 200, 120);
                                          } else if (line.includes('function') || line.includes('const') || line.includes('let') || line.includes('var') || line.includes('class') || line.includes('import')) {
                                            // Keywords - soft purple
                                            doc.setTextColor(180, 120, 255);
                                          } else if (line.includes('"') || line.includes("'") || line.includes('`')) {
                                            // Strings - soft yellow
                                            doc.setTextColor(255, 220, 120);
                                          } else if (/\d+/.test(line)) {
                                            // Numbers - soft orange
                                            doc.setTextColor(255, 160, 100);
                                          } else {
                                            // Default - light gray
                                            doc.setTextColor(240, 240, 240);
                                          }
                                          
                                          doc.text(line, 22, lineY);
                                        });
                                        
                                        yPosition += blockHeight + 15;
                                        
                                      } else if (segment.trim()) {
                                        // Handle regular text with improved typography
                                        doc.setFont('helvetica', 'normal');
                                        doc.setFontSize(12);
                                        doc.setTextColor(240, 240, 240); // Light gray for readability
                                        
                                        const lines = doc.splitTextToSize(segment, 170);
                                        
                                        lines.forEach((line: string) => {
                                          if (yPosition > 270) {
                                            doc.addPage();
                                            // Set carbon black background for new page
                                            doc.setFillColor(12, 12, 12);
                                            doc.rect(0, 0, 210, 297, 'F');
                                            yPosition = 25;
                                          }
                                          
                                          // Enhanced markdown parsing with better spacing
                                          let cleanLine = line;
                                          
                                          // Check for bold (**text**)
                                          if (line.match(/\*\*.*?\*\*/)) {
                                            doc.setFont('helvetica', 'bold');
                                            doc.setTextColor(255, 255, 255); // Pure white for emphasis
                                            cleanLine = line.replace(/\*\*(.*?)\*\*/g, '$1');
                                          }
                                          // Check for italic (*text*)
                                          else if (line.match(/\*.*?\*/)) {
                                            doc.setFont('helvetica', 'italic');
                                            doc.setTextColor(220, 220, 220); // Slightly dimmed
                                            cleanLine = line.replace(/\*(.*?)\*/g, '$1');
                                          }
                                          // Check for headers (# text)
                                          else if (line.match(/^#+\s/)) {
                                            doc.setFont('helvetica', 'bold');
                                            doc.setFontSize(14);
                                            doc.setTextColor(100, 200, 255); // Light blue for headers
                                            cleanLine = line.replace(/^#+\s/, '');
                                          }
                                          // Check for lists (- text or * text)
                                          else if (line.match(/^[\s]*[-*]\s/)) {
                                            doc.setTextColor(200, 200, 200); // Medium gray for lists
                                            cleanLine = '• ' + line.replace(/^[\s]*[-*]\s/, '');
                                          }
                                          else {
                                            doc.setFont('helvetica', 'normal');
                                            doc.setFontSize(12);
                                            doc.setTextColor(240, 240, 240);
                                          }
                                          
                                          doc.text(cleanLine, 20, yPosition);
                                          yPosition += 8; // Better line spacing
                                        });
                                        
                                        yPosition += 6; // Extra spacing after paragraphs
                                      }
                                    });

                                    // Generate filename
                                    const date = new Date().toISOString().split('T')[0];
                                    const filename = `chatgenius-${date}.pdf`;
                                    
                                    // Save the PDF
                                    doc.save(filename);
                                    
                                    toast({
                                                title: "PDF Generated",
          description: "Document has been downloaded",
                                    });
                                  } catch (error) {
                                    console.error('Error generating PDF:', error);
                                    toast({
                                      title: "Error",
                                      description: "Failed to generate PDF. Please try again.",
                                      variant: "destructive"
                                    });
                                  }
                                }}
                                className="cursor-pointer"
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download as PDF
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </div>
                  </div>

                  {msg.sender === 'user' && (
                    <div className="h-8 w-8 bg-muted rounded-full flex items-center justify-center text-xs font-medium">
                      {getUserInitials()}
                    </div>
                  )}
                </div>
              ))
            )}
            
            {isLoading && (
              <div className="flex gap-4 max-w-[70%]">
                <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  {currentChat?.character?.emoji || '🤖'}
                </div>
                <div className="bg-muted rounded-2xl px-4 py-3 inline-block">
                  <div className="flex items-end gap-1">
                    <div className="w-2.5 h-2.5 bg-muted-foreground/70 rounded-full animate-bounce" style={{ animationDuration: '0.6s' }}></div>
                    <div className="w-2.5 h-2.5 bg-muted-foreground/70 rounded-full animate-bounce" style={{ animationDuration: '0.6s', animationDelay: '0.2s' }}></div>
                    <div className="w-2.5 h-2.5 bg-muted-foreground/70 rounded-full animate-bounce" style={{ animationDuration: '0.6s', animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="border-t border-border/40 p-2">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col gap-2">
              <div className="flex gap-3 items-end">
                <div className="flex-1 relative">
                  <input
                    type="file"
                    ref={imageInputRef}
                    accept="image/*,application/pdf"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  {!selectedImage && (
                    <Button
                      onClick={() => imageInputRef.current?.click()}
                      size="icon"
                      variant="ghost"
                      className="absolute left-3 top-1/2 -translate-y-1/2 z-10 rounded-full h-8 w-8 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed group"
                      disabled={isLoading || !isGeminiConfigured}
                      title="Upload image or PDF"
                    >
                      <div className="absolute inset-0 rounded-full bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                      <Plus className="h-4 w-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-transform duration-200 group-hover:rotate-90" />
                    </Button>
                  )}
                  {selectedImage && (
                    <div className="absolute left-1.5 top-1/2 -translate-y-1/2 z-10 flex items-center gap-2 rounded-full bg-muted pl-1.5 pr-3 py-1">
                      {selectedImage.type === 'application/pdf' ? (
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        selectedImage.type.startsWith('image/') && (
                          <div className="h-9 w-9 rounded overflow-hidden border border-border/50 rounded-full">
                            <img 
                              src={URL.createObjectURL(selectedImage)} 
                              alt="Preview" 
                              className="h-full w-full object-cover "
                            />
                          </div>
                        )
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground truncate max-w-[150px]">
                          {selectedImage.name}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
                          onClick={() => setSelectedImage(null)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isGeminiConfigured ? 
                      selectedImage ? 
                        selectedImage.type === 'application/pdf' ? 
                          "Add a message about the PDF..." : 
                          "Add a message about the image..." 
                        : "Spill your thoughts..." 
                      : "Still waiting for that API key..."
                    }
                    className={`flex-1 rounded-full ${selectedImage ? 'pl-[265px]' : 'pl-12'} pr-6 py-4 text-sm border-2 ${
                      isListening ? 'border-red-500/50 bg-red-500/10' : 'border-border/50 bg-background/50'
                    } focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-200 backdrop-blur-sm resize-none min-h-[3.4rem] max-h-32 scrollbar-hide`}
                    disabled={isLoading || !isGeminiConfigured}
                    rows={1}
                    style={{ 
                      height: 'auto',
                      minHeight: '3.4rem'
                    }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = '3.4rem';
                      target.style.height = Math.min(target.scrollHeight, 128) + 'px';
                    }}
                  />
                </div>
                {speechSupported && (
                  <div className="flex gap-2 mb-2">
                    {isListening ? (
                      <Button
                        onClick={stopListening}
                        size="icon"
                        variant="destructive"
                        className="rounded-full h-10 w-10 transition-all duration-200 hover:scale-105 relative"
                        title="Stop recording"
                      >
                        <div className="absolute inset-0 rounded-full">
                          <div className="absolute inset-0 animate-ping rounded-full bg-red-500 opacity-20"></div>
                          <div className="absolute inset-0 animate-pulse rounded-full bg-red-500 opacity-30"></div>
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-1">
                            <div className="w-1 h-3 bg-red-500 rounded-full animate-wave"></div>
                            <div className="w-1 h-3 bg-red-500 rounded-full animate-wave" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-1 h-3 bg-red-500 rounded-full animate-wave" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                        <Square className="h-4 w-4 relative z-10" />
                      </Button>
                    ) : (
                      <Button
                        onClick={startListening}
                        size="icon"
                        variant="ghost"
                        className="rounded-full h-10 w-10 transition-all duration-200 hover:scale-105 hover:shadow-lg"
                        title="Start recording"
                      >
                        <Mic className="h-5 w-5" />
                      </Button>
                    )}
                  </div>
                )}
                <Button
                  onClick={sendMessage}
                  disabled={!message.trim() || isLoading || !isGeminiConfigured}
                  size="icon"
                  className="rounded-full h-10 w-10 transition-all duration-200 hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mb-2"
                >
                  <ArrowUpRight className="h-5 w-5" />
                </Button>
              </div>
            
            </div>
          </div>
        </div>
      </div>

      {/* System Instruction Modal */}
      <SystemInstructionModal
        open={isSystemInstructionModalOpen}
        onClose={() => setIsSystemInstructionModalOpen(false)}
        onSave={handleSaveSystemInstruction}
        currentInstruction={systemInstruction}
      />
      
      {/* Character Creation Modal */}
      <CharacterModal
        open={isCharacterModalOpen}
        onClose={() => {
          setIsCharacterModalOpen(false);
          setEditingCharacter(null);
        }}
        onCreateCharacter={handleCreateCharacter}
        editingCharacter={editingCharacter}
      />

      {/* Challenge Modal */}
      <ChallengeModal
        open={isChallengeModalOpen}
        onClose={() => setIsChallengeModalOpen(false)}
        onStartChallenge={handleStartChallenge}
      />

      {/* Character Hub Modal */}
      <CharacterHubModal
        open={isCharacterHubModalOpen}
        onClose={() => setIsCharacterHubModalOpen(false)}
        onAdoptCharacter={handleAdoptCharacter}
      />

      {/* Add Alert Dialog for Delete Confirmation */}
      <AlertDialog open={deleteType !== null} onOpenChange={() => setDeleteType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteType === 'chat' ? 'Clear Conversation History' : 
               deleteType === 'challenge' ? 'Remove Challenge' : 'Remove Assistant'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteType === 'chat' 
                ? "This action will permanently remove all messages from this conversation while preserving the assistant configuration. This operation cannot be reversed."
                : deleteType === 'challenge'
                ? "This action will permanently remove this challenge and all associated responses. This operation cannot be reversed."
                : "This action will permanently remove this assistant and all associated conversations. This operation cannot be reversed."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className={deleteType === 'chat' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-destructive hover:bg-destructive/90'}
            >
              {deleteType === 'chat' ? 'Clear History' : 
               deleteType === 'challenge' ? 'Remove Challenge' : 'Remove Assistant'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;

// Add these TypeScript declarations at the end of the file
declare global {
  interface Window {
    webkitSpeechRecognition: new () => SpeechRecognition;
    SpeechRecognition: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: () => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionEvent {
  results: {
    [index: number]: {
      isFinal: boolean;
      [index: number]: {
        transcript: string;
      };
    };
  };
}
