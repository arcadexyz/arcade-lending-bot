// arcadeApi.ts

import dotenv from 'dotenv';
import axios, { AxiosResponse, Method } from 'axios';

dotenv.config();

export function log(message: string): void {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp}: ${message}`);
}

export async function arcadeApiRequest(method: Method, endpoint: string, data: any = null): Promise<any> {
  const url = `${process.env.ARCADE_API_BASE_URL}/api/v2/${endpoint}`;
  const headers = { 'x-api-key': process.env.ARCADE_API_KEY };

  log(`Making API request to: ${url}`);
  try {
    const response: AxiosResponse = await axios({ method, url, headers, data });
    log(`Received response from API with status: ${response.status}`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      log(`Error in API request: ${error.message}`);
      if (error.response) {
        log(`Response status: ${error.response.status}`);
        log(`Response data: ${JSON.stringify(error.response.data)}`);
      }
    } else {
      log(`Unexpected error: ${error}`);
    }
    throw error;
  }
}