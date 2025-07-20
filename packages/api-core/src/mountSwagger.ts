import fs from 'fs';
import path from 'path';
import swaggerAutogen from 'swagger-autogen';
import swaggerUi from 'swagger-ui-express';

export async function setupSwagger(app: any, routesFiles: string[]) {
  const outputDir = path.resolve(process.cwd(), 'swagger-output.json');

  const doc = {
    info: {
      title: 'API Documentation',
      description: 'Auto-generated Swagger documentation',
    },
    host: `localhost:${process.env.PORT || 5000}`,
    schemes: ['http'],
  };

  // ✅ Log des fichiers scannés
  console.log('📄 Swagger will scan the following files:');
  routesFiles.forEach((file) => console.log(`   - ${file}`));

  const swaggerAutogenInstance = swaggerAutogen();

  await swaggerAutogenInstance(outputDir, routesFiles, doc);

  if (fs.existsSync(outputDir)) {
    console.log(`✅ Swagger output generated: ${outputDir}`);
    const swaggerFile = require(outputDir);
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));
  } else {
    console.warn('⚠️ Swagger output not generated!');
  }
}
