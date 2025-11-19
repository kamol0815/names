import { config } from '../config';
export type ClickRedirectParams = {
  amount: number;
  planId: string;
  userId: string;
};
const CLICK_URL = `https://my.click.uz`;
const BOT_URL = 'https://t.me/n17kamolBot';

export function buildClickProviderUrl(params: ClickRedirectParams): string {
  const serviceId = config.CLICK_SERVICE_ID;
  const merchantId = config.CLICK_MERCHANT_ID;
  const merchantTransId = params.userId;
  const intAmount = Math.floor(Number(params.amount));
  const planCode = (params.planId || '').replace(/\s+/g, '').toLowerCase();
  return `${CLICK_URL}/services/pay?service_id=${serviceId}&merchant_id=${merchantId}&amount=${intAmount}&transaction_param=${merchantTransId}&additional_param3=${encodeURIComponent(
    params.planId,
  )}&additional_param4=${encodeURIComponent(planCode)}&return_url=${BOT_URL}`;
}

export function getClickRedirectLink(params: ClickRedirectParams) {
  return buildClickProviderUrl(params);
}
