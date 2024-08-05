import dotenv from 'dotenv';
import axios, { AxiosResponse, Method } from 'axios';

dotenv.config();

export async function arcadeApiRequest(method: Method, endpoint: string, data: any = null): Promise<any> {
  const url = `${process.env.ARCADE_API_BASE_URL}/api/v2/${endpoint}`;
  const headers = { 'x-api-key': process.env.ARCADE_API_KEY };

  try {
    const response: AxiosResponse = await axios({ method, url, headers, data });
    return response.data;
  } catch (error) {
    throw error;
  }
}