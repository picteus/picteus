export interface LlamaServerHealth
{

  readonly isReachable: boolean;
  readonly isReady: boolean;
  readonly status: string;
  readonly details?: string;

}

export interface ChatRequestOptions
{

  readonly model: string;
  readonly prompt: string;
  readonly imageBase64: string;
  readonly temperature?: number;
  readonly maxTokens?: number;

}

export interface ChatResponseResult
{

  readonly content: string;
  readonly durationInMilliseconds: number;
  readonly model: string;
  readonly promptTokens?: number;
  readonly completionTokens?: number;
  readonly totalTokens?: number;

}

export interface TagExtractionResult
{

  readonly tags: string[];
  readonly durationInMilliseconds: number;
  readonly model: string;

}

export interface LlamaModelDetail
{

  readonly id: string;
  readonly comment?: string;

}

