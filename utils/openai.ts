
import { Configuration, OpenAIApi } from 'openai';

if (!process.env.OPENAI_API_KEY) {
	throw new Error('Missing OpenAI Credentials');
}

const configuration = new Configuration({
	apiKey: process.env.OPENAI_API_KEY,
});
export const openai = new OpenAIApi(configuration);
