import { Request } from 'express';

function test(req: Request) {
  req.validatedQuery;   // ✅ doit être reconnu maintenant
  req.validatedBody;    // ✅ doit être reconnu
  req.validatedParams;  // ✅ doit être reconnu
}
