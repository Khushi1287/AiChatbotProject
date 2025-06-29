import { supabase } from './supabase';

export interface Message {
  id: string;
  user_id: string;
  character_id: string;
  content: string;
  sender: 'user' | 'bot';
  created_at: string;
}

export interface DefaultAIMessage {
  id: string;
  user_id: string;
  content: string;
  sender: 'user' | 'bot';
  created_at: string;
}

export class MessageService {
  // Get all messages for a specific character
  static async getMessages(characterId: string): Promise<Message[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', user.id)
      .eq('character_id', characterId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  // Get all default AI messages
  static async getDefaultAIMessages(): Promise<DefaultAIMessage[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('default_ai_messages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  // Create a new message
  static async createMessage(message: {
    character_id: string;
    content: string;
    sender: 'user' | 'bot';
  }): Promise<Message> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('messages')
      .insert({
        user_id: user.id,
        character_id: message.character_id,
        content: message.content,
        sender: message.sender,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Create a new default AI message
  static async createDefaultAIMessage(message: {
    content: string;
    sender: 'user' | 'bot';
  }): Promise<DefaultAIMessage> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('default_ai_messages')
      .insert({
        user_id: user.id,
        content: message.content,
        sender: message.sender,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Delete all messages for a character
  static async deleteMessages(characterId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('user_id', user.id)
      .eq('character_id', characterId);

    if (error) throw error;
  }

  // Delete all default AI messages
  static async deleteDefaultAIMessages(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('default_ai_messages')
      .delete()
      .eq('user_id', user.id);

    if (error) throw error;
  }
} 