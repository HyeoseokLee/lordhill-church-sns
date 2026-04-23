import { z } from 'zod';
import { ErrClass, ErrInfo } from '../err.js';

export const validate = (schema) => (req, _res, next) => {
  try {
    if (schema.body) {
      req.body = schema.body.parse(req.body);
    }
    if (schema.query) {
      req.query = schema.query.parse(req.query);
    }
    if (schema.params) {
      req.params = schema.params.parse(req.params);
    }
    next();
  } catch (err) {
    if (err instanceof z.ZodError) {
      throw new ErrClass(ErrInfo.BadRequest, err.errors[0].message);
    }
    throw err;
  }
};
