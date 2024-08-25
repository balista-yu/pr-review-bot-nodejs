import {GenerativeModel, GoogleGenerativeAI} from '@google/generative-ai';

const geminiApiKey: string = process.env.GEMINI_API_KEY || '';

const generativeAI = new GoogleGenerativeAI(geminiApiKey);

export const generativeModel: GenerativeModel = generativeAI.getGenerativeModel({
  model: 'gemini-1.5-flash-latest',
});
