// src/app/openapi.json/route.ts

export async function GET() {
  const spec = {
    openapi: '3.0.0',
    info: {
      title: 'UCLA Sound Recorder API',
      version: '1.0.0',
      description: 'API for recording and managing audio experiences at various locations',
    },
    servers: [
      {
        url: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
        description: 'API server',
      },
    ],
    paths: {
      '/api/recordings': {
        get: {
          summary: 'Get all recordings',
          description: 'Retrieves a list of all audio recordings with metadata',
          tags: ['Recordings'],
          responses: {
            '200': {
              description: 'List of recordings',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/Recording',
                    },
                  },
                },
              },
            },
            '500': {
              description: 'Failed to read recordings',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
          },
        },
        post: {
          summary: 'Create a new recording',
          description: 'Creates a new audio recording with metadata and scores',
          tags: ['Recordings'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['audioData', 'title', 'studentName', 'locationId', 'locationName'],
                  properties: {
                    audioData: {
                      type: 'string',
                      description: 'Base64-encoded audio data (webm format)',
                      example: 'data:audio/webm;base64,GkXfo59ChoEBQveBAULygQRC...',
                    },
                    title: {
                      type: 'string',
                      description: 'Title of the recording',
                      example: 'Morning sounds at the quad',
                    },
                    description: {
                      type: 'string',
                      description: 'Description of the recording',
                      example: 'Birds chirping and students chatting',
                    },
                    studentName: {
                      type: 'string',
                      description: 'Name of the student making the recording',
                      example: 'John Doe',
                    },
                    locationId: {
                      type: 'string',
                      description: 'Unique identifier for the location',
                      example: 'royce-hall',
                    },
                    locationName: {
                      type: 'string',
                      description: 'Human-readable name of the location',
                      example: 'Royce Hall',
                    },
                    recordingType: {
                      type: 'string',
                      description: 'Type of recording',
                      example: 'memory',
                    },
                    score: {
                      type: 'number',
                      minimum: 0,
                      maximum: 10,
                      description: 'Legacy single score (0-10)',
                      example: 7,
                    },
                    scores: {
                      $ref: '#/components/schemas/FourScores',
                    },
                    averageScore: {
                      type: 'number',
                      description: 'Computed average of the four scores',
                      example: 7.5,
                    },
                    lat: {
                      type: 'number',
                      description: 'Latitude coordinate',
                      example: 34.0689,
                    },
                    lng: {
                      type: 'number',
                      description: 'Longitude coordinate',
                      example: -118.4452,
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Recording created successfully',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Recording',
                  },
                },
              },
            },
            '400': {
              description: 'Invalid request data',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
            '500': {
              description: 'Failed to save recording',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
          },
        },
        delete: {
          summary: 'Delete a recording',
          description: 'Deletes a recording by ID',
          tags: ['Recordings'],
          parameters: [
            {
              name: 'id',
              in: 'query',
              required: true,
              schema: {
                type: 'string',
              },
              description: 'ID of the recording to delete',
              example: '1699564800000',
            },
          ],
          responses: {
            '200': {
              description: 'Recording deleted successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: {
                        type: 'boolean',
                        example: true,
                      },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'No ID provided',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
            '404': {
              description: 'Recording not found',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
            '500': {
              description: 'Failed to delete recording',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
          },
        },
      },
      '/api/recordings/upload': {
        post: {
          summary: 'Upload an audio file',
          description: 'Upload an existing audio file with metadata and scores',
          tags: ['Recordings'],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  required: ['file', 'studentName', 'title', 'locationId', 'locationName'],
                  properties: {
                    file: {
                      type: 'string',
                      format: 'binary',
                      description: 'Audio file to upload',
                    },
                    studentName: {
                      type: 'string',
                      description: 'Name of the student',
                      example: 'John Doe',
                    },
                    title: {
                      type: 'string',
                      description: 'Title of the recording',
                      example: 'Campus ambience',
                    },
                    description: {
                      type: 'string',
                      description: 'Description of the recording',
                      example: 'Evening sounds',
                    },
                    locationId: {
                      type: 'string',
                      description: 'Location identifier',
                      example: 'powell-library',
                    },
                    locationName: {
                      type: 'string',
                      description: 'Location name',
                      example: 'Powell Library',
                    },
                    recordingType: {
                      type: 'string',
                      description: 'Type of recording',
                      example: 'memory',
                    },
                    'scores[importance]': {
                      type: 'number',
                      minimum: 0,
                      maximum: 10,
                      description: 'How meaningful this place feels (0-10)',
                      example: 8,
                    },
                    'scores[emotion]': {
                      type: 'number',
                      minimum: 0,
                      maximum: 10,
                      description: 'How strongly you feel it (0-10)',
                      example: 7,
                    },
                    'scores[intensity]': {
                      type: 'number',
                      minimum: 0,
                      maximum: 10,
                      description: 'How vivid or stimulating it is (0-10)',
                      example: 6,
                    },
                    'scores[aesthetic]': {
                      type: 'number',
                      minimum: 0,
                      maximum: 10,
                      description: 'How attractive or aesthetic it is (0-10)',
                      example: 9,
                    },
                    lat: {
                      type: 'number',
                      description: 'Latitude',
                      example: 34.0689,
                    },
                    lng: {
                      type: 'number',
                      description: 'Longitude',
                      example: -118.4452,
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'File uploaded successfully',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Recording',
                  },
                },
              },
            },
            '400': {
              description: 'Invalid request data',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
            '500': {
              description: 'Failed to upload recording',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
          },
        },
      },
      '/api/rankings': {
        get: {
          summary: 'Get location rankings',
          description: 'Get aggregated statistics and rankings by location',
          tags: ['Rankings'],
          responses: {
            '200': {
              description: 'Location rankings with aggregated scores',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/LocationRanking',
                    },
                  },
                },
              },
            },
            '500': {
              description: 'Failed to compute rankings',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error',
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        Recording: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique identifier (timestamp)',
              example: '1699564800000',
            },
            locationId: {
              type: 'string',
              description: 'Location identifier',
              example: 'royce-hall',
            },
            locationName: {
              type: 'string',
              description: 'Human-readable location name',
              example: 'Royce Hall',
            },
            title: {
              type: 'string',
              description: 'Recording title',
              example: 'Morning sounds',
            },
            description: {
              type: 'string',
              description: 'Recording description',
              example: 'Birds and students',
            },
            studentName: {
              type: 'string',
              description: 'Student who made the recording',
              example: 'John Doe',
            },
            recordingType: {
              type: 'string',
              description: 'Type of recording',
              example: 'memory',
            },
            score: {
              type: 'number',
              description: 'Legacy single score (0-10)',
              example: 7,
            },
            scores: {
              $ref: '#/components/schemas/FourScores',
            },
            averageScore: {
              type: 'number',
              description: 'Average of the four dimension scores',
              example: 7.5,
            },
            filename: {
              type: 'string',
              description: 'Audio file name',
              example: '1699564800000_royce-hall_memory.webm',
            },
            audioUrl: {
              type: 'string',
              description: 'URL to access the audio file',
              example: '/recordings/1699564800000_royce-hall_memory.webm',
            },
            date: {
              type: 'string',
              format: 'date-time',
              description: 'ISO timestamp of creation',
              example: '2024-11-09T12:00:00.000Z',
            },
            lat: {
              type: 'number',
              description: 'Latitude coordinate',
              example: 34.0689,
            },
            lng: {
              type: 'number',
              description: 'Longitude coordinate',
              example: -118.4452,
            },
          },
        },
        FourScores: {
          type: 'object',
          description: 'Four-dimensional scoring system',
          properties: {
            importance: {
              type: 'number',
              minimum: 0,
              maximum: 10,
              description: 'How meaningful this place feels',
              example: 8,
            },
            emotion: {
              type: 'number',
              minimum: 0,
              maximum: 10,
              description: 'How strongly you feel it',
              example: 7,
            },
            intensity: {
              type: 'number',
              minimum: 0,
              maximum: 10,
              description: 'How vivid or stimulating it is',
              example: 6,
            },
            aesthetic: {
              type: 'number',
              minimum: 0,
              maximum: 10,
              description: 'How attractive or aesthetic it is',
              example: 9,
            },
          },
        },
        LocationRanking: {
          type: 'object',
          properties: {
            locationId: {
              type: 'string',
              description: 'Location identifier',
              example: 'royce-hall',
            },
            locationName: {
              type: 'string',
              description: 'Location name',
              example: 'Royce Hall',
            },
            count: {
              type: 'number',
              description: 'Number of recordings at this location',
              example: 15,
            },
            avg: {
              type: 'number',
              description: 'Average overall score',
              example: 7.5,
            },
            avgByDim: {
              type: 'object',
              description: 'Average scores by dimension',
              properties: {
                importance: {
                  type: 'number',
                  example: 8.2,
                },
                emotion: {
                  type: 'number',
                  example: 7.1,
                },
                intensity: {
                  type: 'number',
                  example: 6.5,
                },
                aesthetic: {
                  type: 'number',
                  example: 8.8,
                },
              },
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
              example: 'Failed to save recording',
            },
            details: {
              type: 'string',
              description: 'Additional error details',
              example: 'Invalid audio format',
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Recordings',
        description: 'Operations for managing audio recordings',
      },
      {
        name: 'Rankings',
        description: 'Operations for viewing location rankings and statistics',
      },
    ],
  };

  return Response.json(spec);
}