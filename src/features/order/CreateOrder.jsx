import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Form, redirect, useActionData, useNavigation } from 'react-router-dom';
import store from '../../store';
import { createOrder } from '../../services/apiRestaurant';
import { clearCart, getCart, getTotalCartPrice } from '../cart/cartSlice';
import Button from '../../ui/Button';
import { formatCurrency } from '../../utils/helpers';
import EmptyCart from '../cart/EmptyCart';
import { fetchAddress } from '../user/userSlice';

// https://uibakery.io/regex-library/phone-number
const isValidPhone = (str) =>
  /^\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}$/.test(
    str,
  );

function CreateOrder() {
  const [withPriority, setWithPriority] = useState(false);
  const formErrors = useActionData();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const {
    username,
    status: fetchStatus,
    position,
    address,
    error: errorAddress,
  } = useSelector((store) => store.user);
  const cart = useSelector(getCart);
  const totalCartPrice = useSelector(getTotalCartPrice);

  const isSubmitting = navigation.state === 'submitting';
  const priorityPrice = withPriority ? totalCartPrice * 0.2 : 0;
  const totalPrice = totalCartPrice + priorityPrice;
  const isLoadingAdddress = fetchStatus === 'loading';

  if (cart.length === 0) return <EmptyCart />;

  return (
    <div className="px-4 py-6">
      <h2 className="mb-8 text-xl font-semibold">
        Ready to order? Let&apos;s go!
      </h2>

      <Form method="POST">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="sm:basis-40">First Name</label>
          <input
            className="input grow"
            type="text"
            name="customer"
            required
            defaultValue={username}
          />
        </div>

        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="sm:basis-40">Phone number</label>
          <div className="grow">
            <input className="input w-full" type="tel" name="phone" required />
            {formErrors?.phone && (
              <p className="mt-2 rounded-md bg-red-100 p-2 text-xs text-red-700">
                {formErrors.phone}
              </p>
            )}
          </div>
        </div>

        <div className="relative mb-5 flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="sm:basis-40">Address</label>
          <div className="grow">
            <input
              className="input w-full"
              type="text"
              name="address"
              defaultValue={address}
              disabled={isLoadingAdddress}
              required
            />
            {fetchStatus === 'error' && (
              <p className="mt-2 rounded-md bg-red-100 p-2 text-xs text-red-700">
                {errorAddress}
              </p>
            )}
          </div>
          {!position.longitude && !position.latitude && (
            <span className="absolute right-[3px] top-[3px] z-50 md:right-[5px] md:top-[5px]">
              <Button
                type="small"
                disabled={isLoadingAdddress}
                onClick={(e) => {
                  e.preventDefault();
                  dispatch(fetchAddress());
                }}
              >
                Get Geolocation
              </Button>
            </span>
          )}
        </div>

        <div className="mb-12 flex items-center gap-5">
          <input
            className="h-6 w-6 accent-yellow-400 focus:ring focus:ring-yellow-400 focus:ring-offset-2"
            type="checkbox"
            name="priority"
            id="priority"
            value={withPriority}
            onChange={(e) => setWithPriority(e.target.checked)}
          />
          <label className="font-medium" htmlFor="priority">
            Want to yo give your order priority?
          </label>
        </div>

        <div>
          <input type="hidden" name="cart" value={JSON.stringify(cart)} />
          <input
            type="hidden"
            name="position"
            value={
              position.longitude && position.latitude
                ? `${position.latitude},${position.longitude}`
                : ''
            }
          />
          <Button disabled={isSubmitting || isLoadingAdddress} type="primary">
            {isSubmitting
              ? 'Placing order...'
              : `Order now from ${formatCurrency(totalPrice)}`}
          </Button>
        </div>
      </Form>
    </div>
  );
}

export default CreateOrder;

//連接收到的表單資料 → 創建新 order
export async function action({ request }) {
  const formData = await request.formData();
  const data = Object.fromEntries(formData);
  const order = {
    ...data,
    priority: data.priority === 'true',
    cart: JSON.parse(data.cart),
  };

  //處理可能的 errors (ex. 輸入的電話不是電話)
  const errors = {};
  if (!isValidPhone(order.phone))
    errors.phone =
      'Please give us your correct phone number. We might need it to contact you.';

  //如果有 errors，return
  if (Object.keys(errors).length > 0) return errors;

  //if every thing is OK, create new order and redirect
  const newOrder = await createOrder(order);

  //Use hack to clear cart (Do not overuse)
  store.dispatch(clearCart());

  return redirect(`/order/${newOrder.id}`);
}
