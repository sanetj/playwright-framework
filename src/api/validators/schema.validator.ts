import Ajv, { ValidateFunction } from 'ajv';
import { cartSchema, loginResponseSchema, orderSchema, productSchema } from '../schema/schemas';
import { Cart } from '../../../models/Cart';
import { LoginResponse } from '../../../models/LoginResponse';
import { Order } from '../../../models/Order';
import { Product } from '../../../models/Product';

const ajv = new Ajv({ allErrors: true });

export class SchemaValidator {
  private static readonly loginValidator = ajv.compile(loginResponseSchema) as ValidateFunction;
  private static readonly productValidator = ajv.compile(productSchema) as ValidateFunction;
  private static readonly cartValidator = ajv.compile(cartSchema) as ValidateFunction;
  private static readonly orderValidator = ajv.compile(orderSchema) as ValidateFunction;

  public static validateLogin(payload: unknown): payload is LoginResponse { return this.assert(this.loginValidator, payload); }
  public static validateProduct(payload: unknown): payload is Product { return this.assert(this.productValidator, payload); }
  public static validateCart(payload: unknown): payload is Cart { return this.assert(this.cartValidator, payload); }
  public static validateOrder(payload: unknown): payload is Order { return this.assert(this.orderValidator, payload); }

  private static assert<T>(validator: ValidateFunction, payload: unknown): payload is T {
    const valid = validator(payload);
    if (!valid) throw new Error(`Schema validation failed: ${ajv.errorsText(validator.errors)}`);
    return true;
  }
}
