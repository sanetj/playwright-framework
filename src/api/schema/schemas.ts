import { Cart } from '../../../models/Cart';
import { LoginResponse } from '../../../models/LoginResponse';
import { Order } from '../../../models/Order';
import { Product } from '../../../models/Product';

export const loginResponseSchema = {
  type: 'object', properties: {
    token: { type: 'string' }, expiresIn: { type: 'number', nullable: true }, refreshToken: { type: 'string', nullable: true }, userId: { type: 'number', nullable: true }
  }, required: ['token'], additionalProperties: true
};

export const productSchema = {
  type: 'object', properties: { id: { type: 'number' }, name: { type: 'string' }, sku: { type: 'string', nullable: true }, description: { type: 'string', nullable: true }, price: { type: 'number' }, inStock: { type: 'boolean', nullable: true } },
  required: ['id', 'name', 'price'], additionalProperties: true
};

export const cartSchema = {
  type: 'object', properties: { id: { type: 'number' }, userId: { type: 'number', nullable: true }, items: { type: 'array', items: { type: 'object', properties: { itemId: { type: 'number' }, productId: { type: 'number' }, productName: { type: 'string' }, quantity: { type: 'number' }, unitPrice: { type: 'number' } }, required: ['itemId','productId','productName','quantity','unitPrice'], additionalProperties: true } }, totalAmount: { type: 'number' } },
  required: ['id','items','totalAmount'], additionalProperties: true
};

export const orderSchema = {
  type: 'object', properties: { id: { type: 'number' }, userId: { type: 'number' }, status: { type: 'string' }, items: { type: 'array', items: { type: 'object', properties: { itemId: { type: 'number' }, productId: { type: 'number' }, productName: { type: 'string' }, quantity: { type: 'number' }, unitPrice: { type: 'number' } }, required: ['itemId','productId','productName','quantity','unitPrice'], additionalProperties: true } }, totalAmount: { type: 'number' }, createdAt: { type: 'string' } },
  required: ['id','userId','status','items','totalAmount','createdAt'], additionalProperties: true
};
