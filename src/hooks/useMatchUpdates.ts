import { useEffect } from 'react';

export const useMatchUpdates = (championshipId: string, onUpdate: (data: any) => void) => {
  useEffect(() => {
    if (!championshipId) return;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: number | null = null; // ← corrigido: number

    const connect = () => {
      eventSource = new EventSource(`/championships/${championshipId}/stream`);

      eventSource.addEventListener('matchUpdate', (event) => {
        try {
          const data = JSON.parse(event.data);
          onUpdate(data);
        } catch (e) {
          console.error('Erro ao processar evento SSE', e);
        }
      });

      eventSource.onerror = (err) => {
        console.error('SSE error', err);
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(() => {
          console.log('Tentando reconectar SSE...');
          connect();
        }, 5000);
      };
    };

    connect();

    return () => {
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [championshipId, onUpdate]);
};