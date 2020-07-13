import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Invalid Customer');
    }

    const allProducts = await this.productsRepository.findAllById(products);

    const orderProducts = products.map(product => {
      const findProduct = allProducts.find(item => item.id === product.id);

      if (!findProduct) {
        throw new AppError('Invalid Product');
      }

      if (product.quantity > findProduct.quantity) {
        throw new AppError('Product Quantity is less than available');
      }

      findProduct.quantity -= product.quantity;

      return {
        product_id: product.id,
        price: findProduct.price,
        quantity: product.quantity,
      };
    });

    const order = await this.ordersRepository.create({
      customer,
      products: orderProducts,
    });

    await this.productsRepository.updateQuantity(allProducts);

    return order;
  }
}

export default CreateOrderService;
