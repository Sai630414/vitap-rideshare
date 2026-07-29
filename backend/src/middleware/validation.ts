import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import AppError from '../utils/appError';

export const validateRequest = (schema: AnyZodObject) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map(
          (err) => `${err.path.join('.')}: ${err.message}`
        );
        return next(new AppError(`Validation failed: ${errorMessages.join('. ')}`, 400));
      }
      next(error);
    }
  };
};

export default validateRequest;
