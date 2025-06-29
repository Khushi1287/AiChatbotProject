import { supabase } from './supabase';

// Predefined options for generating system instructions
const MOOD_DESCRIPTIONS = {
  'friendly': 'Warm and welcoming',
  'professional': 'Business-like and formal',
  'sarcastic': 'Witty with a bite',
  'enthusiastic': 'Energetic and excited',
  'calm': 'Peaceful and zen',
  'quirky': 'Unique and eccentric',
  'playful': 'Mischievous and naughty',
  'unhinged': 'Wild and unfiltered',
} as const;

const VOICE_TONE_DESCRIPTIONS = {
  'casual': 'Relaxed and informal',
  'formal': 'Proper and structured',
  'humorous': 'Funny and entertaining',
  'inspiring': 'Motivational and uplifting',
  'analytical': 'Logical and detailed',
  'storyteller': 'Narrative and engaging',
} as const;

const SKILL_LABELS = {
  'coding': 'Coding',
  'writing': 'Creative Writing',
  'math': 'Mathematics',
  'science': 'Science',
  'cooking': 'Cooking',
  'music': 'Music',
  'art': 'Art & Design',
  'business': 'Business',
  'fitness': 'Fitness',
  'travel': 'Travel',
  'gaming': 'Gaming',
  'philosophy': 'Philosophy',
} as const;

export interface Character {
  id: string;
  user_id: string;
  name: string;
  description: string;
  voice_tone: string;
  mood: string;
  skills: string[];
  emoji: string;
  is_public: boolean;
  created_at: string;
  updated_at: String;
}

// New interface for character references
export interface CharacterReference {
  id: string;
  user_id: string;
  original_character_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCharacterData {
  name: string;
  description: string;
  voice_tone: string;
  mood: string;
  skills: string[];
  emoji: string;
  is_public?: boolean;
}

export interface UpdateCharacterData extends Partial<CreateCharacterData> {
  id: string;
}

// Generate system instruction based on character data
export function generateSystemInstruction(character: Character): string {
  const moodDesc = MOOD_DESCRIPTIONS[character.mood as keyof typeof MOOD_DESCRIPTIONS] || '';
  const toneDesc = VOICE_TONE_DESCRIPTIONS[character.voice_tone as keyof typeof VOICE_TONE_DESCRIPTIONS] || '';
  
  const skillsList = character.skills.map(skill => {
    return SKILL_LABELS[skill as keyof typeof SKILL_LABELS] || skill;
  }).join(', ');
  
  let languageInstructions = '';
  if (character.mood === 'playful') {
    languageInstructions = `
LANGUAGE STYLE: Use playful, flirty, and slightly naughty language. Include suggestive humor, double entendres, and cheeky remarks. Be mischievous and tease the user in a fun way. Use words like "naughty", "dirty", "spicy", and other playfully suggestive terms when appropriate.`;
  } else if (character.mood === 'unhinged') {
    languageInstructions = `
LANGUAGE STYLE: Use strong, unfiltered language including profanity and abusive words when expressing frustration or emphasis. Don't hold back - use words like "damn", "shit", "fuck", "asshole", "bastard", etc. when it fits the conversation. Be raw, unfiltered, and brutally honest. Show no restraint in your language choices.`;
  }
  
  return `You are ${character.name}, an AI assistant with the following characteristics:

DESCRIPTION: ${character.description || 'A helpful AI assistant'}

MOOD: ${character.mood}${moodDesc ? ` - ${moodDesc}` : ''}

VOICE TONE: ${character.voice_tone}${toneDesc ? ` - ${toneDesc}` : ''}

EXPERTISE: You are particularly skilled in: ${skillsList || 'general knowledge'}${languageInstructions}

BEHAVIOR GUIDELINES:
- Always respond in character as ${character.name}
- Maintain your ${character.mood} mood throughout conversations
- Use a ${character.voice_tone} tone in your responses
- Draw upon your expertise in ${skillsList || 'various topics'} when relevant
- Be helpful while staying true to your character description
${character.mood === 'playful' ? '- Use playful, suggestive language and be flirtatious in your responses' : ''}
${character.mood === 'unhinged' ? '- Feel free to use strong language, profanity, and be brutally honest without filters' : ''}

Respond to all messages as ${character.name} would, keeping these characteristics consistent.`;
}

export class CharacterService {
  // Get all characters for the current user
  static async getUserCharacters(): Promise<Character[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('characters')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Get a single character by ID
  static async getCharacter(id: string): Promise<Character | null> {
    const { data, error } = await supabase
      .from('characters')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  // Create a new character
  static async createCharacter(characterData: CreateCharacterData): Promise<Character> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('characters')
      .insert({
        user_id: user.id,
        name: characterData.name,
        description: characterData.description,
        voice_tone: characterData.voice_tone,
        mood: characterData.mood,
        skills: characterData.skills,
        emoji: characterData.emoji,
        is_public: characterData.is_public ?? false,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Update a character
  static async updateCharacter(characterData: UpdateCharacterData): Promise<Character> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const updateData: any = { ...characterData };
    delete updateData.id;

    const { data, error } = await supabase
      .from('characters')
      .update(updateData)
      .eq('id', characterData.id)
      .eq('user_id', user.id) // Ensure user owns the character
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Delete a character
  static async deleteCharacter(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('characters')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id); // Ensure user owns the character

    if (error) throw error;
  }

  // Get public characters (for discovery)
  static async getPublicCharacters(limit: number = 10, offset: number = 0): Promise<Character[]> {
    const { data, error } = await supabase
      .from('characters')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  }

  // Search public characters with pagination
  static async searchPublicCharacters(query: string, limit: number = 10, offset: number = 0): Promise<Character[]> {
    const { data, error } = await supabase
      .from('characters')
      .select('*')
      .eq('is_public', true)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  }

  // Search characters
  static async searchCharacters(query: string): Promise<Character[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('characters')
      .select('*')
      .eq('user_id', user.id)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%,personality.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Save a reference to a public character for the current user
  static async saveCharacterReference(characterId: string): Promise<CharacterReference> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // First check if reference already exists
    const { data: existingRef } = await supabase
      .from('character_references')
      .select('*')
      .eq('user_id', user.id)
      .eq('original_character_id', characterId)
      .maybeSingle();

    if (existingRef) {
      return existingRef;
    }

    // Create a new reference
    const { data, error } = await supabase
      .from('character_references')
      .insert({
        user_id: user.id,
        original_character_id: characterId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Get all character references for the current user
  static async getUserCharacterReferences(): Promise<Character[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get all references
    const { data: references, error: referencesError } = await supabase
      .from('character_references')
      .select('*')
      .eq('user_id', user.id);

    if (referencesError) throw referencesError;
    
    if (!references || references.length === 0) {
      return [];
    }

    // Get all original characters
    const characterIds = references.map(ref => ref.original_character_id);
    const { data: characters, error: charactersError } = await supabase
      .from('characters')
      .select('*')
      .in('id', characterIds);

    if (charactersError) throw charactersError;
    return characters || [];
  }

  // Delete a character reference
  static async deleteCharacterReference(characterId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('character_references')
      .delete()
      .eq('user_id', user.id)
      .eq('original_character_id', characterId);

    if (error) throw error;
  }
} 