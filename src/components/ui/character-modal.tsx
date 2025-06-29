import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  X, User, Brain, Mic, Heart, Sparkles, ArrowRight, ArrowLeft, 
  Globe, Lock, Smile, Search, Plus, Trash2, Check, AlertCircle 
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Character } from '@/lib/characters';

interface CharacterModalProps {
  open: boolean;
  onClose: () => void;
  onCreateCharacter: (character: CharacterConfig) => void;
  editingCharacter?: Character | null;
}

export interface CharacterConfig {
  name: string;
  description: string;
  voice_tone: string;
  mood: string;
  skills: string[];
  emoji: string;
  is_public: boolean;
}

const moods = [
  { id: 'friendly', label: 'Friendly', emoji: '😊', description: 'Warm and welcoming' },
  { id: 'professional', label: 'Professional', emoji: '💼', description: 'Business-like and formal' },
  { id: 'sarcastic', label: 'Sarcastic', emoji: '😏', description: 'Witty with a bite' },
  { id: 'enthusiastic', label: 'Enthusiastic', emoji: '🎉', description: 'Energetic and excited' },
  { id: 'calm', label: 'Calm', emoji: '🧘', description: 'Peaceful and zen' },
  { id: 'quirky', label: 'Quirky', emoji: '🤪', description: 'Unique and eccentric' },
  { id: 'mysterious', label: 'Mysterious', emoji: '🕵️', description: 'Enigmatic and intriguing' },
  { id: 'playful', label: 'Playful', emoji: '🎭', description: 'Fun and lighthearted' },
  { id: 'unhinged', label: 'Unhinged', emoji: '🤯', description: 'Chaotically unpredictable' },
  { id: 'dark', label: 'Dark', emoji: '🌑', description: 'Mysterious and ominous' },
];

const skills = [
  { id: 'coding', label: 'Coding', emoji: '💻', category: 'tech' },
  { id: 'writing', label: 'Creative Writing', emoji: '✍️', category: 'creative' },
  { id: 'math', label: 'Mathematics', emoji: '🔢', category: 'academic' },
  { id: 'science', label: 'Science', emoji: '🔬', category: 'academic' },
  { id: 'cooking', label: 'Cooking', emoji: '👨‍🍳', category: 'lifestyle' },
  { id: 'music', label: 'Music', emoji: '🎵', category: 'creative' },
  { id: 'art', label: 'Art & Design', emoji: '🎨', category: 'creative' },
  { id: 'business', label: 'Business', emoji: '📈', category: 'professional' },
  { id: 'fitness', label: 'Fitness', emoji: '💪', category: 'lifestyle' },
  { id: 'travel', label: 'Travel', emoji: '✈️', category: 'lifestyle' },
  { id: 'gaming', label: 'Gaming', emoji: '🎮', category: 'entertainment' },
  { id: 'philosophy', label: 'Philosophy', emoji: '🤔', category: 'academic' },
  { id: 'psychology', label: 'Psychology', emoji: '🧠', category: 'academic' },
  { id: 'languages', label: 'Languages', emoji: '🗣️', category: 'academic' },
  { id: 'finance', label: 'Finance', emoji: '💰', category: 'professional' },
  { id: 'marketing', label: 'Marketing', emoji: '📢', category: 'professional' },
];

const voiceTones = [
  { id: 'casual', label: 'Casual', emoji: '😎', description: 'Relaxed and informal' },
  { id: 'formal', label: 'Formal', emoji: '🎩', description: 'Proper and structured' },
  { id: 'humorous', label: 'Humorous', emoji: '😂', description: 'Funny and entertaining' },
  { id: 'inspiring', label: 'Inspiring', emoji: '🌟', description: 'Motivational and uplifting' },
  { id: 'analytical', label: 'Analytical', emoji: '🔍', description: 'Logical and detailed' },
  { id: 'storyteller', label: 'Storyteller', emoji: '📚', description: 'Narrative and engaging' },
  { id: 'empathetic', label: 'Empathetic', emoji: '🤗', description: 'Understanding and caring' },
  { id: 'direct', label: 'Direct', emoji: '🎯', description: 'Straight to the point' },
];

// Organized emoji categories
const emojiCategories = {
  people: {
    label: 'People & Professions',
    emojis: [
      '🤖', '👨‍💼', '👩‍💼', '🧙‍♂️', '🧙‍♀️', '👨‍🔬', '👩‍🔬', '👨‍🎨', '👩‍🎨', 
      '👨‍🍳', '👩‍🍳', '👨‍💻', '👩‍💻', '👨‍🎓', '👩‍🎓', '👨‍⚕️', '👩‍⚕️', 
      '👨‍🏫', '👩‍🏫', '🦸‍♂️', '🦸‍♀️', '👨‍🎤', '👩‍🎤', '👨‍🚀', '👩‍🚀'
    ]
  },
  faces: {
    label: 'Faces & Expressions',
    emojis: [
      '😊', '😎', '🤔', '😌', '🥰', '😇', '🤓', '😋', '🙂', '😉', '🤗', '😄',
      '😁', '😆', '🤣', '😂', '🙃', '😍', '🤩', '😴', '🤯', '🧐', '🤨', '😏'
    ]
  },
  animals: {
    label: 'Animals & Nature',
    emojis: [
      '🐱', '🐶', '🦊', '🐼', '🐨', '🦁', '🐯', '🐸', '🐧', '🦉', '🐺', '🐙',
      '🦋', '🐝', '🦄', '🐉', '🐢', '🦎', '🐠', '🐳', '🦈', '🐙', '🦀', '🦞'
    ]
  },
  objects: {
    label: 'Objects & Symbols',
    emojis: [
      '⚡', '🔥', '💎', '🌟', '✨', '🎭', '🎪', '🎨', '🎯', '🎲', '🔮', '💡',
      '🔬', '🔭', '⚗️', '🧪', '🔧', '⚙️', '🛡️', '⚔️', '🏆', '🎖️', '🏅', '👑'
    ]
  }
};



// Emoji Picker Component
const EmojiPicker: React.FC<{
  selectedEmoji: string;
  onEmojiSelect: (emoji: string) => void;
}> = ({ selectedEmoji, onEmojiSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof emojiCategories>('people');

  const filteredEmojis = useMemo(() => {
    if (!searchTerm) return emojiCategories[selectedCategory].emojis;
    
    return Object.values(emojiCategories)
      .flatMap(category => category.emojis)
      .filter(emoji => {
        // Simple search - could be enhanced with emoji names/descriptions
        return true; // For now, return all since we don't have emoji names
      });
  }, [searchTerm, selectedCategory]);

  return (
    <div className="w-80">
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search emojis..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </div>
      
      {!searchTerm && (
        <div className="flex border-b">
          {Object.entries(emojiCategories).map(([key, category]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key as keyof typeof emojiCategories)}
              className={`flex-1 px-2 py-2 text-xs font-medium transition-colors ${
                selectedCategory === key
                  ? 'text-primary border-b-2 border-primary bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {category.label.split(' ')[0]}
            </button>
          ))}
        </div>
      )}

      <ScrollArea className="h-48">
        <div className="p-2">
          <div className="grid grid-cols-8 gap-1">
            {filteredEmojis.map((emoji, index) => (
              <button
                key={`${emoji}-${index}`}
                onClick={() => onEmojiSelect(emoji)}
                className={`p-2 text-lg hover:bg-muted rounded transition-colors ${
                  selectedEmoji === emoji ? 'bg-primary/20 ring-2 ring-primary' : ''
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

// Character Preview Component
const CharacterPreview: React.FC<{ character: CharacterConfig }> = ({ character }) => {
  const selectedMood = moods.find(m => m.id === character.mood);
  const selectedTone = voiceTones.find(t => t.id === character.voice_tone);
  
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{character.emoji}</div>
          <div>
            <CardTitle className="text-lg">{character.name || 'Your Character'}</CardTitle>
            <CardDescription className="text-sm">
              {character.description || 'No description yet'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2 text-sm">
          {selectedMood && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Mood:</span>
              <Badge variant="secondary" className="text-xs">
                {selectedMood.emoji} {selectedMood.label}
              </Badge>
            </div>
          )}
          {selectedTone && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Tone:</span>
              <Badge variant="secondary" className="text-xs">
                {selectedTone.emoji} {selectedTone.label}
              </Badge>
            </div>
          )}
          {character.skills.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground">Skills:</span>
              <div className="flex flex-wrap gap-1">
                {character.skills.slice(0, 3).map(skillId => {
                  const skill = skills.find(s => s.id === skillId);
                  return (
                    <Badge key={skillId} variant="outline" className="text-xs">
                      {skill?.emoji} {skill?.label || skillId}
                    </Badge>
                  );
                })}
                {character.skills.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{character.skills.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const CharacterModal: React.FC<CharacterModalProps> = ({ 
  open, 
  onClose, 
  onCreateCharacter, 
  editingCharacter 
}) => {
  const [step, setStep] = useState(1);
  const [character, setCharacter] = useState<CharacterConfig>({
    name: '',
    description: '',
    voice_tone: '',
    mood: '',
    skills: [],
    emoji: '🤖',
    is_public: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customSkillInput, setCustomSkillInput] = useState('');

  // Initialize character data when editing
  useEffect(() => {
    if (editingCharacter) {
      setCharacter({
        name: editingCharacter.name,
        description: editingCharacter.description,
        voice_tone: editingCharacter.voice_tone,
        mood: editingCharacter.mood,
        skills: editingCharacter.skills,
        emoji: editingCharacter.emoji,
        is_public: editingCharacter.is_public,
      });
    } else {
      // Reset to default when creating new character
      setCharacter({
        name: '',
        description: '',
        voice_tone: '',
        mood: '',
        skills: [],
        emoji: '🤖',
        is_public: false,
      });
    }
  }, [editingCharacter]);

  const validateStep = useCallback((stepNum: number): boolean => {
    const newErrors: Record<string, string> = {};
    
    switch (stepNum) {
      case 1:
        if (!character.name.trim()) {
          newErrors.name = 'Character name is required';
        } else if (character.name.length < 2) {
          newErrors.name = 'Name must be at least 2 characters';
        } else if (character.name.length > 30) {
          newErrors.name = 'Name must be less than 30 characters';
        }
        break;
      case 2:
        if (!character.mood.trim()) {
          newErrors.mood = 'Please select a mood or enter a custom one';
        }
        break;
      case 3:
        if (character.skills.length === 0) {
          newErrors.skills = 'Please select at least one skill';
        }
        break;
      case 4:
        if (!character.voice_tone.trim()) {
          newErrors.voice_tone = 'Please select a communication style';
        }
        break;
      case 5:
        if (!character.description.trim()) {
          newErrors.description = 'Character description is required';
        } else if (character.description.length < 10) {
          newErrors.description = 'Description must be at least 10 characters';
        } else if (character.description.length > 200) {
          newErrors.description = 'Description must be less than 200 characters';
        }
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [character]);

  const handleNext = useCallback(() => {
    if (validateStep(step)) {
      if (step < 5) {
        setStep(step + 1);
      } else {
        onCreateCharacter(character);
        handleClose();
      }
    }
  }, [step, character, validateStep, onCreateCharacter]);

  const handleBack = useCallback(() => {
    if (step > 1) {
      setStep(step - 1);
      setErrors({});
    }
  }, [step]);

  const handleClose = useCallback(() => {
    setStep(1);
    setCharacter({
      name: '',
      description: '',
      voice_tone: '',
      mood: '',
      skills: [],
      emoji: '🤖',
      is_public: false,
    });
    setErrors({});
    setCustomSkillInput('');
    onClose();
  }, [onClose]);

  const toggleSkill = useCallback((skillId: string) => {
    setCharacter(prev => ({
      ...prev,
      skills: prev.skills.includes(skillId)
        ? prev.skills.filter(s => s !== skillId)
        : [...prev.skills, skillId]
    }));
  }, []);

  const addCustomSkill = useCallback(() => {
    const skill = customSkillInput.trim();
    if (skill && !character.skills.includes(skill) && character.skills.length < 10) {
      setCharacter(prev => ({
        ...prev,
        skills: [...prev.skills, skill]
      }));
      setCustomSkillInput('');
    }
  }, [customSkillInput, character.skills]);

  const removeSkill = useCallback((skillToRemove: string) => {
    setCharacter(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skillToRemove)
    }));
  }, []);

  const skillsByCategory = useMemo(() => {
    return skills.reduce((acc, skill) => {
      if (!acc[skill.category]) acc[skill.category] = [];
      acc[skill.category].push(skill);
      return acc;
    }, {} as Record<string, typeof skills>);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <Card className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden transform animate-in zoom-in-95 duration-300 border-primary/20 shadow-2xl shadow-primary/10">
        <CardHeader className="relative border-b bg-gradient-to-r from-primary/5 to-transparent">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 z-10 hover:bg-destructive/10 hover:text-destructive transition-colors duration-200"
            onClick={handleClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Header content */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div>
                <CardTitle className="text-2xl font-bold text-foreground">
                  {editingCharacter ? 'Edit Character' : 'Build Your Snarky AI Pal'}
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  {editingCharacter ? `Step ${step} of 5 - Update your character settings` : `Step ${step} of 5 - Craft your not-so-average companion`}
                </CardDescription>
              </div>
            </div>
            
            {/* Progress bar - show for both create and edit modes */}
            <div className="w-full flex gap-1 h-2.5 mt-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div 
                  key={index} 
                  className={`flex-1 rounded-full transition-all duration-500 ease-out ${index < step ? 'bg-primary' : 'bg-muted'}`}
                />
              ))}
            </div>
          </div>
        </CardHeader>

        <div className="flex">
          {/* Main Content */}
          <div className="flex-1">
            <ScrollArea className="h-[60vh]">
              <CardContent className="p-6 space-y-6">
                {/* Step 1: Name and Emoji */}
                {step === 1 && (
                  <div className="space-y-6">
                    <div className="text-center space-y-2">
                      <User className="h-12 w-12 text-primary mx-auto" />
                      <h3 className="text-xl font-semibold">So, what's this AI's deal?</h3>
                      <p className="text-muted-foreground">Pick a name and a face for your digital sidekick, I guess.</p>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-base font-medium">
                          AI Name (Yeah, it's required)
                        </Label>
                        <Input
                          id="name"
                          type="text"
                          placeholder="e.g., Einstein, Sage, Buddy, Luna..."
                          value={character.name}
                          onChange={(e) => setCharacter(prev => ({ ...prev, name: e.target.value }))}
                          className={`text-lg h-12 ${errors.name ? 'border-destructive' : ''}`}
                          autoFocus
                        />
                        {errors.name && (
                          <Alert className="border-destructive/50 text-destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{errors.name}</AlertDescription>
                          </Alert>
                        )}
                      </div>
                      
                      {/* Emoji Selection */}
                      <div className="space-y-3">
                        <Label className="text-base font-medium">Profile Avatar (Pick something snazzy)</Label>
                        <div className="flex items-center gap-4">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="h-16 w-16 text-3xl hover:scale-105 transition-transform"
                              >
                                {character.emoji}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <EmojiPicker
                                selectedEmoji={character.emoji}
                                onEmojiSelect={(emoji) => setCharacter(prev => ({ ...prev, emoji }))}
                              />
                            </PopoverContent>
                          </Popover>
                          <div className="flex-1">
                            <p className="text-sm font-medium">Click to pick a face, genius.</p>
                            <p className="text-xs text-muted-foreground">
                              This little picture's gonna be your character's vibe everywhere.
                            </p>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* Step 2: Mood */}
                {step === 2 && (
                  <div className="space-y-6">
                    <div className="text-center space-y-2">
                      <Heart className="h-12 w-12 text-primary mx-auto" />
                      <h3 className="text-xl font-semibold">What's {character.name}s attitude problem?</h3>
                      <p className="text-muted-foreground">Pick a mood for this digital drama queen/king.</p>
                    </div>
                    
                    <div className="space-y-4">
                      {/* Custom mood input */}
                      <div className="space-y-2">
                        <Label htmlFor="custom-mood" className="text-base font-medium">
                          Custom Attitude (Go wild)
                        </Label>
                        <Input
                          id="custom-mood"
                          type="text"
                          placeholder="e.g., mysterious, playful, wise, energetic..."
                          value={character.mood}
                          onChange={(e) => setCharacter(prev => ({ ...prev, mood: e.target.value }))}
                          className={`h-10 ${errors.mood ? 'border-destructive' : ''}`}
                        />
                      </div>
                      
                      <div className="text-center">
                        <Separator className="mb-4" />
                        <p className="text-sm text-muted-foreground mb-4">Or grab one of these overused tropes:</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        {moods.map(mood => (
                          <Card
                            key={mood.id}
                            className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
                              character.mood === mood.id
                                ? 'ring-2 ring-primary bg-primary/5' 
                                : 'hover:bg-muted/50'
                            }`}
                            onClick={() => setCharacter(prev => ({ ...prev, mood: mood.id }))}
                          >
                            <CardContent className="p-4 text-center">
                              <div className="text-3xl mb-2">{mood.emoji}</div>
                              <div className="font-semibold text-sm">{mood.label}</div>
                              <div className="text-xs text-muted-foreground mt-1">{mood.description}</div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Skills */}
                {step === 3 && (
                  <div className="space-y-6">
                    <div className="text-center space-y-2">
                      <Brain className="h-12 w-12 text-primary mx-auto" />
                      <h3 className="text-xl font-semibold">What's {character.name} good at?</h3>
                      <p className="text-muted-foreground">Pick some skills or make up your own. No pressure.</p>
                    </div>
                    
                    <div className="space-y-6">
                      {/* Custom skill input */}
                      <div className="space-y-2">
                        <Label htmlFor="custom-skill" className="text-base font-medium">
                          Add Custom Skill (Be creative)
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="custom-skill"
                            type="text"
                            placeholder="e.g., time travel, cooking, existential crisis management..."
                            value={customSkillInput}
                            onChange={(e) => setCustomSkillInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addCustomSkill();
                              }
                            }}
                            className="flex-1"
                          />
                          <Button
                            onClick={addCustomSkill}
                            disabled={!customSkillInput.trim() || character.skills.length >= 10}
                            className="px-4"
                          >
                            Add
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {character.skills.length}/10 skills • Press Enter to add
                        </p>
                      </div>
                      
                      {/* Selected skills */}
                      {character.skills.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-base font-medium">Selected Skills:</Label>
                          <div className="flex flex-wrap gap-2">
                            {character.skills.map(skill => (
                              <Badge
                                key={skill}
                                variant="secondary"
                                className="cursor-pointer hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => setCharacter(prev => ({
                                  ...prev,
                                  skills: prev.skills.filter(s => s !== skill)
                                }))}
                              >
                                {skill} ×
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-3">Or steal from this list of clichés:</p>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3">
                        {skills.map(skill => (
                          <Card
                            key={skill.id}
                            className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
                              character.skills.includes(skill.id)
                                ? 'ring-2 ring-primary bg-primary/5' 
                                : 'hover:bg-muted/50'
                            }`}
                            onClick={() => toggleSkill(skill.id)}
                          >
                            <CardContent className="p-3 text-center">
                              <div className="text-2xl mb-1">{skill.emoji}</div>
                              <div className="font-semibold text-xs">{skill.label}</div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4: Voice Tone and Privacy */}
                {step === 4 && (
                  <div className="space-y-6">
                    <div className="text-center space-y-2">
                      <Mic className="h-12 w-12 text-primary mx-auto" />
                      <h3 className="text-xl font-semibold">How's {character.name} gonna mouth off?</h3>
                      <p className="text-muted-foreground">Pick a style and decide who gets to deal with this AI.</p>
                    </div>
                    
                    <div className="space-y-6">
                      {/* Voice Tone */}
                      <div className="space-y-4">
                        <Label className="text-base font-medium">Talking Style (Pick a flavor)</Label>
                        <div className="grid grid-cols-2 gap-3">
                          {voiceTones.map(tone => (
                            <Card
                              key={tone.id}
                              className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
                                character.voice_tone === tone.id 
                                  ? 'ring-2 ring-primary bg-primary/5' 
                                  : 'hover:bg-muted/50'
                              }`}
                              onClick={() => setCharacter(prev => ({ ...prev, voice_tone: tone.id }))}
                            >
                              <CardContent className="p-4 text-center">
                                <div className="text-3xl mb-2">{tone.emoji}</div>
                                <div className="font-semibold text-sm">{tone.label}</div>
                                <div className="text-xs text-muted-foreground mt-1">{tone.description}</div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>

                      {/* Privacy Settings */}
                      <div className="space-y-4">
                        <Label className="text-base font-medium">Who's stuck with this character?</Label>
                        <Card className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              {character.is_public ? (
                                <Globe className="h-5 w-5 text-primary" />
                              ) : (
                                <Lock className="h-5 w-5 text-muted-foreground" />
                              )}
                              <div>
                                <div className="font-semibold text-sm">
                                  {character.is_public ? 'Public Nuisance' : 'Private Pain'}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {character.is_public 
                                    ? 'Everyone gets to suffer with this character'
                                    : 'Just you have to put up with this one'
                                  }
                                </div>
                              </div>
                            </div>
                            <Switch
                              checked={character.is_public}
                              onCheckedChange={(checked) => setCharacter(prev => ({ ...prev, is_public: checked }))}
                            />
                          </div>
                        </Card>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 5: Description */}
                {step === 5 && (
                  <div className="space-y-6">
                    <div className="text-center space-y-2">
                      <Smile className="h-12 w-12 text-primary mx-auto" />
                      <h3 className="text-xl font-semibold">Spill the tea on {character.name}</h3>
                      <p className="text-muted-foreground">What's this character's whole shtick?</p>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="description" className="text-base font-medium">
                          Character Description (Don't skimp)
                        </Label>
                        <Textarea
                          id="description"
                          placeholder="e.g., A wise and witty AI assistant who loves solving complex problems with a touch of humor. Always ready to help with creative solutions and enjoys engaging in meaningful conversations..."
                          value={character.description}
                          onChange={(e) => setCharacter(prev => ({ ...prev, description: e.target.value }))}
                          className={`h-32 resize-none overflow-hidden ${errors.description ? 'border-destructive' : ''}`}
                          autoFocus
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{character.description.length}/200 characters</span>
                          <span>{character.description.length < 10 ? 'At least 10 characters needed' : '✓ Good length'}</span>
                        </div>
                        {errors.description && (
                          <Alert className="border-destructive/50 text-destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{errors.description}</AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </ScrollArea>
          </div>

          {/* Character Preview Sidebar */}
          <div className="w-80 border-l bg-muted/20 p-4">
            <div className="sticky top-0">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                Preview
              </h4>
              <CharacterPreview character={character} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex justify-between items-center bg-muted/20">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 1}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex gap-1">
              {Array.from({ length: 5 }, (_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i + 1 <= step ? 'bg-primary' : 'bg-muted-foreground/30'
                  }`}
                />
              ))}
            </div>
            <span>{step} of 5</span>
          </div>
          
          <Button
            onClick={handleNext}
            className="flex items-center gap-2"
          >
            {step === 5 ? (
              <>
                <Sparkles className="h-4 w-4" />
                {editingCharacter ? 'Update Character' : 'Unleash This Character'}
              </>
            ) : (
              <>
                Next, I Guess
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
};