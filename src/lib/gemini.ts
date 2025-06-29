import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, Part } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
];

// Get the Gemini Pro model with safety settings
const model = genAI.getGenerativeModel({ 
  model: 'gemini-2.0-flash-lite',
  safetySettings,
});

export interface ChatMessage {
  role: 'user' | 'model';
  parts: string;
}

export interface ChallengeConfig {
  source: 'document' | 'topic';
  questionType: 'subjective' | 'objective';
  numberOfQuestions: number;
  answerTiming: 'after_each' | 'at_final';
  customInstruction?: string;
  questions?: string; // Response from Gemini containing generated questions
}

export class GeminiService {
  private chat: any;
  private systemInstruction: string = '';

  constructor() {
    this.chat = model.startChat({
      history: [],
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
      },
      safetySettings,
    });
  }

  async sendMessage(message: string): Promise<string> {
    try {
      if (!import.meta.env.VITE_GEMINI_API_KEY) {
        throw new Error('Gemini API key not found. Please set VITE_GEMINI_API_KEY in your environment variables.');
      }

      let fullMessage = message;
      if (this.systemInstruction && this.chat.params.history.length === 0) {
        fullMessage = `${this.systemInstruction}\n\nUser: ${message}`;
      }

      const result = await this.chat.sendMessage(fullMessage);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error sending message to Gemini:', error);
      throw new Error('Failed to get response from AI. Please try again.');
    }
  }

  // Start a new chat session
  startNewChat(systemInstruction?: string) {
    this.systemInstruction = systemInstruction || '';
    this.chat = model.startChat({
      history: [],
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
      },
      safetySettings,
    });
  }

  // Set system instruction for character
  setSystemInstruction(instruction: string) {
    this.systemInstruction = instruction;
  }

  // Get chat history
  async getChatHistory(): Promise<ChatMessage[]> {
    try {
      const history = await this.chat.getHistory();
      return history.map((msg: any) => ({
        role: msg.role,
        parts: msg.parts[0].text,
      }));
    } catch (error) {
      console.error('Error getting chat history:', error);
      return [];
    }
  }

  private createChallengePrompt(content: string, config: ChallengeConfig): string {
    const questionType = config.questionType === 'objective' ? 'multiple-choice' : 'open-ended';
    const basePrompt = `You are an expert educator. Generate ${config.numberOfQuestions} ${questionType} questions based on the following content. You MUST return ONLY a valid JSON object with no additional text or formatting.

Content:
${content}

Requirements:
1. Generate exactly ${config.numberOfQuestions} questions
2. For each question:
   ${config.questionType === 'objective' ? 
     '- Write a clear question\n   - Provide exactly 4 options labeled a, b, c, d\n   - Include the correct answer and explanation' :
     '- Write a clear question\n   - Include a detailed marking scheme with points and marks per point'}
3. Ensure questions:
   - Are clearly worded
   - Progress from easier to harder
   - Cover different aspects of the topic
   - Include calculations where appropriate for mathematical/scientific topics

You MUST return ONLY the following JSON structure with no additional text, markdown formatting, or code blocks:

{
  "questions": [
    {
      "id": 1,
      "text": "Write the question text here",
      "type": "${config.questionType}",
      "marks": 5,
      ${config.questionType === 'objective' ? 
        `"options": [
          {"id": "a", "text": "First option"},
          {"id": "b", "text": "Second option"},
          {"id": "c", "text": "Third option"},
          {"id": "d", "text": "Fourth option"}
        ],
        "correctAnswer": "a",
        "explanation": "Explain why this is the correct answer"` :
        `"markingScheme": {
          "points": ["First point to check", "Second point to check"],
          "marksPerPoint": [3, 2]
        }`
      }
    }
  ]
}

CRITICAL RULES:
1. Return ONLY the JSON object - no additional text, no markdown formatting, no code blocks
2. Use double quotes for all strings in JSON
3. Do not use backticks, markdown, or code block formatting
4. For objective questions:
   - Use only "a", "b", "c", "d" for option IDs
   - Include exactly 4 options for each question
5. For subjective questions:
   - Ensure marksPerPoint array length matches points array length
   - Total marks per question should be the sum of marksPerPoint

${config.customInstruction ? `\nAdditional Instructions:\n${config.customInstruction}` : ''}`;

    return basePrompt;
  }

  private validateQuestions(response: string): string {
    try {
      // Try to parse the response
      const parsed = JSON.parse(response);

      // Basic validation
      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error('Invalid response format: missing questions array');
      }

      // Validate each question
      parsed.questions.forEach((q: any, idx: number) => {
        if (!q.id || !q.text || !q.type || !q.marks) {
          throw new Error(`Question ${idx + 1} is missing required fields`);
        }

        if (q.type === 'objective') {
          if (!Array.isArray(q.options) || q.options.length !== 4) {
            throw new Error(`Question ${idx + 1} must have exactly 4 options`);
          }
          if (!q.correctAnswer || !q.explanation) {
            throw new Error(`Question ${idx + 1} is missing correctAnswer or explanation`);
          }
        } else {
          if (!q.markingScheme || !Array.isArray(q.markingScheme.points) || !Array.isArray(q.markingScheme.marksPerPoint)) {
            throw new Error(`Question ${idx + 1} has invalid marking scheme`);
          }
          if (q.markingScheme.points.length !== q.markingScheme.marksPerPoint.length) {
            throw new Error(`Question ${idx + 1} has mismatched points and marks arrays`);
          }
        }
      });

      // Return the validated and stringified JSON
      return JSON.stringify(parsed);
    } catch (error) {
      if (error instanceof SyntaxError) {
        // If it's a JSON parsing error, try to clean the response
        const cleaned = response
          .replace(/^```json\s*/, '') // Remove leading JSON code block
          .replace(/\s*```$/, '')     // Remove trailing code block
          .trim();                    // Remove extra whitespace
        
        // Try parsing again
        try {
          const parsed = JSON.parse(cleaned);
          return JSON.stringify(parsed);
        } catch {
          throw new Error('Invalid JSON format in response');
        }
      }
      throw error;
    }
  }

  async handleDocumentChallenge(file: File, config: ChallengeConfig): Promise<string> {
    try {
      if (!import.meta.env.VITE_GEMINI_API_KEY) {
        throw new Error('Gemini API key not found. Please set VITE_GEMINI_API_KEY in your environment variables.');
      }

      const isPDF = file.type === 'application/pdf';
      
      if (isPDF) {
        // Handle PDF files using Gemini's document processing capabilities
        // PDFs are processed with native vision and can understand both text and image contents
        return await this.handlePDFChallenge(file, config);
      } else {
        // Handle image files using Gemini's vision capabilities
        return await this.handleImageChallenge(file, config);
      }
    } 
    catch (error) {
      console.error('Error handling document challenge:', error);
      throw new Error('Failed to process document challenge. Please try again.');
    }
  }

  private async handlePDFChallenge(file: File, config: ChallengeConfig): Promise<string> {
    try {
      // Convert file to base64 for PDF processing
      const pdfData = await this.fileToBase64(file);
      
      // Create prompt for PDF document analysis
      const prompt = this.createDocumentChallengePrompt(config);
      
      // Send PDF and prompt to Gemini using document processing
      const result = await model.generateContent([
        {
          text: prompt
        },
        {
          inlineData: {
            data: pdfData,
            mimeType: file.type
          }
        }
      ]);
      
      const response = await result.response;
      
      return this.validateQuestions(response.text());
    } catch (error) {
      console.error('Error handling PDF challenge:', error);
      throw new Error('Failed to process PDF document. Please try again.');
    }
  }

  private async handleImageChallenge(file: File, config: ChallengeConfig): Promise<string> {
    try {
      // Convert file to base64 for ImagePart
      const imageData = await this.fileToBase64(file);
      
      // Create prompt for image analysis
      const prompt = this.createImageChallengePrompt(config);
      
      // Send image and prompt to Gemini using ImagePart
      const result = await model.generateContent([
        {
          text: prompt
        },
        {
          inlineData: {
            data: imageData,
            mimeType: file.type
          }
        }
      ]);
      
      const response = await result.response;
      
      return this.validateQuestions(response.text());
    } catch (error) {
      console.error('Error handling image challenge:', error);
      throw new Error('Failed to process image document. Please try again.');
    }
  }

  async handleTopicChallenge(topic: string, config: ChallengeConfig): Promise<string> {
    try {
      if (!import.meta.env.VITE_GEMINI_API_KEY) {
        throw new Error('Gemini API key not found. Please set VITE_GEMINI_API_KEY in your environment variables.');
      }

      // Create a structured topic analysis prompt first
      const topicAnalysisPrompt = `Analyze the following topic and identify key areas to test:
Topic: ${topic}

Please provide:
1. Main concepts and principles
2. Key theories, formulas, or frameworks relevant to the topic
3. Important applications and real-world examples
4. Common misconceptions or challenging aspects
5. Prerequisites and related topics

This analysis will be used to generate exam questions.`;

      // Get topic analysis first
      const analysisResult = await model.generateContent(topicAnalysisPrompt);
      const topicAnalysis = await analysisResult.response.text();

      // Create challenge prompt with the analysis
      const prompt = this.createChallengePrompt(`Topic Analysis:\n${topicAnalysis}`, {
        ...config,
        customInstruction: `${config.customInstruction || ''}\n\nAdditional Guidelines:
1. Use the topic analysis to ensure comprehensive coverage
2. Include questions that test both theoretical understanding and practical applications
3. For technical topics, provide detailed explanations or step-by-step solutions
4. Include at least one question that addresses common misconceptions
5. Ensure questions progress from basic concepts to advanced applications`
      });
      
      // Generate questions using the enhanced prompt
      const result = await model.generateContent(prompt);
      const response = await result.response;
      
      // Validate and clean the response
      return this.validateQuestions(response.text());
    } catch (error) {
      console.error('Error handling topic challenge:', error);
      throw new Error('Failed to process topic challenge. Please try again.');
    }
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        try {
          const result = reader.result as string;
          // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  private createImageChallengePrompt(config: ChallengeConfig): string {
    const questionType = config.questionType === 'objective' ? 'multiple-choice' : 'open-ended';
    const basePrompt = `You are an expert educator. Analyze the image provided and generate ${config.numberOfQuestions} ${questionType} questions based on its content. You MUST return ONLY a valid JSON object with no additional text or formatting.

Requirements:
1. First, carefully analyze the image content, including:
   - Text, diagrams, charts, or mathematical expressions
   - Visual elements, symbols, and their relationships
   - Any educational content or concepts shown
2. Generate exactly ${config.numberOfQuestions} questions based on the image content
3. For each question:
   ${config.questionType === 'objective' ? 
     '- Write a clear question\n   - Provide exactly 4 options labeled a, b, c, d\n   - Include the correct answer and explanation' :
     '- Write a clear question\n   - Include a detailed marking scheme with points and marks per point'}
4. Ensure questions:
   - Are clearly worded and directly related to the image content
   - Progress from easier to harder
   - Cover different aspects shown in the image
   - Include calculations where appropriate if mathematical content is present

You MUST return ONLY the following JSON structure with no additional text, markdown formatting, or code blocks:

{
  "questions": [
    {
      "id": 1,
      "text": "Write the question text here",
      "type": "${config.questionType}",
      "marks": 5,
      ${config.questionType === 'objective' ? 
        `"options": [
          {"id": "a", "text": "First option"},
          {"id": "b", "text": "Second option"},
          {"id": "c", "text": "Third option"},
          {"id": "d", "text": "Fourth option"}
        ],
        "correctAnswer": "a",
        "explanation": "Explain why this is the correct answer"` :
        `"markingScheme": {
          "points": ["First point to check", "Second point to check"],
          "marksPerPoint": [3, 2]
        }`
      }
    }
  ]
}

CRITICAL RULES:
1. Return ONLY the JSON object - no additional text, no markdown formatting, no code blocks
2. Use double quotes for all strings in JSON
3. Do not use backticks, markdown, or code block formatting
4. For objective questions:
   - Use only "a", "b", "c", "d" for option IDs
   - Include exactly 4 options for each question
5. For subjective questions:
   - Ensure marksPerPoint array length matches points array length
   - Total marks per question should be the sum of marksPerPoint

${config.customInstruction ? `\nAdditional Instructions:\n${config.customInstruction}` : ''}`;

    return basePrompt;
  }

  private createDocumentChallengePrompt(config: ChallengeConfig): string {
    const questionType = config.questionType === 'objective' ? 'multiple-choice' : 'open-ended';
    const basePrompt = `You are an expert educator. Analyze the PDF document provided and generate ${config.numberOfQuestions} ${questionType} questions based on its content. You MUST return ONLY a valid JSON object with no additional text or formatting.

Requirements:
1. First, carefully analyze the document content, including:
   - Text content, headings, and structure
   - Tables, charts, diagrams, or mathematical expressions
   - Key concepts, theories, and important information
   - Any educational content or learning objectives
2. Generate exactly ${config.numberOfQuestions} questions based on the document content
3. For each question:
   ${config.questionType === 'objective' ? 
     '- Write a clear question\n   - Provide exactly 4 options labeled a, b, c, d\n   - Include the correct answer and explanation' :
     '- Write a clear question\n   - Include a detailed marking scheme with points and marks per point'}
4. Ensure questions:
   - Are clearly worded and directly related to the document content
   - Progress from easier to harder
   - Cover different sections or concepts from the document
   - Include calculations where appropriate if mathematical content is present
   - Test comprehension, analysis, and application of the material

You MUST return ONLY the following JSON structure with no additional text, markdown formatting, or code blocks:

{
  "questions": [
    {
      "id": 1,
      "text": "Write the question text here",
      "type": "${config.questionType}",
      "marks": 5,
      ${config.questionType === 'objective' ? 
        `"options": [
          {"id": "a", "text": "First option"},
          {"id": "b", "text": "Second option"},
          {"id": "c", "text": "Third option"},
          {"id": "d", "text": "Fourth option"}
        ],
        "correctAnswer": "a",
        "explanation": "Explain why this is the correct answer"` :
        `"markingScheme": {
          "points": ["First point to check", "Second point to check"],
          "marksPerPoint": [3, 2]
        }`
      }
    }
  ]
}

CRITICAL RULES:
1. Return ONLY the JSON object - no additional text, no markdown formatting, no code blocks
2. Use double quotes for all strings in JSON
3. Do not use backticks, markdown, or code block formatting
4. For objective questions:
   - Use only "a", "b", "c", "d" for option IDs
   - Include exactly 4 options for each question
5. For subjective questions:
   - Ensure marksPerPoint array length matches points array length
   - Total marks per question should be the sum of marksPerPoint

${config.customInstruction ? `\nAdditional Instructions:\n${config.customInstruction}` : ''}`;

    return basePrompt;
  }

  async sendImageMessage(image: File, prompt: string): Promise<string> {
    try {
      if (!import.meta.env.VITE_GEMINI_API_KEY) {
        throw new Error('Gemini API key not found. Please set VITE_GEMINI_API_KEY in your environment variables.');
      }

      const imageData = await this.fileToBase64(image);

      const result = await model.generateContent([
        {
          text: prompt || "What's in this image?"
        },
        {
          inlineData: {
            data: imageData,
            mimeType: image.type
          }
        }
      ]);

      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error sending image message:', error);
      throw new Error('Failed to process image. Please try again.');
    }
  }

  async handlePDFMessage(pdf: File, prompt: string): Promise<string> {
    try {
      if (!import.meta.env.VITE_GEMINI_API_KEY) {
        throw new Error('Gemini API key not found. Please set VITE_GEMINI_API_KEY in your environment variables.');
      }

      const pdfData = await this.fileToBase64(pdf);

      const result = await model.generateContent([
        {
          text: prompt || "What's in this PDF?"
        },
        {
          inlineData: {
            data: pdfData,
            mimeType: pdf.type
          }
        }
      ]);

      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error processing PDF message:', error);
      throw new Error('Failed to process PDF. Please try again.');
    }
  }
}

// Export a singleton instance
export const geminiService = new GeminiService(); 