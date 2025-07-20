import path from 'path';
import swaggerAutogen from 'swagger-autogen';

export async function generateSwagger(
  apiName: string,
  routesPath: string,
  options: {
    title: string;
    description: string;
    version?: string;
    host?: string;
    basePath?: string;
  }
) {
  const doc = {
    info: {
      title: options.title,
      description: options.description,
      version: options.version || '1.0.0',
    },
    host: options.host || 'localhost:5000',
    basePath: options.basePath || '/api',
    schemes: ['http'],
  };

  const swagger = swaggerAutogen({ openapi: '3.0.0' });

  const outputFile = path.resolve(process.cwd(), `openapi.${apiName}.yaml`);

  console.log(`🚀 Generating Swagger for ${apiName}...`);
  await swagger(outputFile, [routesPath], doc);

  return outputFile;
}
