import { useEffect } from 'react';
import { API_BASE_URL } from '../api/config';


export const useMatchUpdates = (
  championshipId: string,
  onUpdate: (data: any) => void,
  enabled: boolean = true
) => {
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: number | null = null;
    let closedByCleanup = false;

    const connect = () => {
      eventSource = new EventSource(`${API_BASE_URL}/championships/${championshipId}/stream`);

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

        if (!closedByCleanup) {
          if (reconnectTimeout !== null) {
            clearTimeout(reconnectTimeout);
          }

          reconnectTimeout = window.setTimeout(() => {
            connect();
          }, 5000);
        }
      };
    };

    connect();

    return () => {
      closedByCleanup = true;

      if (eventSource) {
        eventSource.close();
      }

      if (reconnectTimeout !== null) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [championshipId, onUpdate, enabled]);
};