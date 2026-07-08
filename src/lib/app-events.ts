export type PartnerRefreshTopic =
  | 'all'
  | 'appointments'
  | 'availability'
  | 'careRequests'
  | 'cards'
  | 'dashboard'
  | 'devices'
  | 'notifications'
  | 'payments'
  | 'preferences'
  | 'profile'
  | 'support'
  | 'verification';

type PartnerRefreshEvent = {
  topic: PartnerRefreshTopic;
  reason?: string;
  payload?: unknown;
};

type PartnerRefreshListener = (event: PartnerRefreshEvent) => void;

const listeners = new Set<PartnerRefreshListener>();

export function emitPartnerRefresh(topic: PartnerRefreshTopic = 'all', reason?: string, payload?: unknown) {
  const event = { topic, reason, payload };
  listeners.forEach(listener => listener(event));
}

export function subscribePartnerRefresh(
  topics: PartnerRefreshTopic | PartnerRefreshTopic[],
  listener: PartnerRefreshListener,
) {
  const topicList = Array.isArray(topics) ? topics : [topics];

  const wrapped = (event: PartnerRefreshEvent) => {
    if (event.topic === 'all' || topicList.includes('all') || topicList.includes(event.topic)) {
      listener(event);
    }
  };

  listeners.add(wrapped);
  return () => {
    listeners.delete(wrapped);
  };
}
