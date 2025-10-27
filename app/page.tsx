'use client';

import { FormEvent, useCallback, useMemo, useState } from 'react';

type ExportResponse = {
  success: boolean;
  message?: string;
  fileName?: string;
  fileContentBase64?: string;
  total?: number;
};

function toBase64Blob(base64: string, mimeType: string) {
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  return new Blob([bytes], { type: mimeType });
}

export default function HomePage() {
  const [token, setToken] = useState('');
  const [atecoCode, setAtecoCode] = useState('1071');
  const [province, setProvince] = useState('VR');
  const [limit, setLimit] = useState(100);
  const [maxResults, setMaxResults] = useState(500);
  const [useSandbox, setUseSandbox] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return Boolean(token.trim()) && Boolean(atecoCode.trim()) && Boolean(province.trim());
  }, [token, atecoCode, province]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setFeedback(null);
      setSuccessMessage(null);

      if (!canSubmit || isSubmitting) {
        return;
      }

      setIsSubmitting(true);

      try {
        const response = await fetch('/api/export', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: token.trim(),
            atecoCode: atecoCode.trim(),
            province: province.trim().toUpperCase(),
            limit,
            maxResults,
            sandbox: useSandbox,
          }),
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || `Errore HTTP ${response.status}`);
        }

        const payload = (await response.json()) as ExportResponse;

        if (!payload.success || !payload.fileContentBase64 || !payload.fileName) {
          throw new Error(payload.message || 'La risposta non contiene un file valido.');
        }

        const blob = toBase64Blob(payload.fileContentBase64, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = payload.fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(downloadUrl);

        const totalText = payload.total ? ` Totale record esportati: ${payload.total}.` : '';
        setSuccessMessage(`Esportazione completata con successo.${totalText}`);
      } catch (error) {
        if (error instanceof Error) {
          setFeedback(error.message);
        } else {
          setFeedback('Si è verificato un errore inatteso.');
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [token, atecoCode, province, limit, maxResults, useSandbox, canSubmit, isSubmitting],
  );

  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Estrazione aziende Openapi
        </h1>
        <p className="max-w-3xl text-base leading-relaxed text-slate-600">
          Inserisci il tuo token personale di Openapi e il codice ATECO di interesse. Il sistema
          interrogherà l&apos;endpoint <code className="rounded bg-slate-200 px-1">/IT-search</code>,
          filtrerà per provincia, e genererà un file Excel scaricabile con i risultati arricchiti
          (dataset &quot;advanced&quot;).
        </p>
        <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Il token viene utilizzato esclusivamente per questa chiamata e non viene memorizzato.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-6 md:grid-cols-2">
          <label className="flex flex-col space-y-2">
            <span className="text-sm font-medium text-slate-700">Token Openapi *</span>
            <input
              type="password"
              className="rounded-lg border border-slate-300 px-3 py-2 text-base shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Inserisci il token"
              required
            />
          </label>

          <label className="flex flex-col space-y-2">
            <span className="text-sm font-medium text-slate-700">Codice ATECO *</span>
            <input
              type="text"
              className="rounded-lg border border-slate-300 px-3 py-2 text-base shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              value={atecoCode}
              onChange={(event) => setAtecoCode(event.target.value)}
              placeholder="Es. 1071 o 10.71"
              required
            />
          </label>

          <label className="flex flex-col space-y-2">
            <span className="text-sm font-medium text-slate-700">Provincia *</span>
            <input
              type="text"
              className="rounded-lg border border-slate-300 px-3 py-2 text-base uppercase shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              value={province}
              maxLength={2}
              onChange={(event) => setProvince(event.target.value.toUpperCase())}
              placeholder="VR"
              required
            />
          </label>

          <label className="flex flex-col space-y-2">
            <span className="text-sm font-medium text-slate-700">Risultati per richiesta</span>
            <input
              type="number"
              min={1}
              max={1000}
              className="rounded-lg border border-slate-300 px-3 py-2 text-base shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              value={limit}
              onChange={(event) => setLimit(Number(event.target.value) || 1)}
            />
          </label>

          <label className="flex flex-col space-y-2">
            <span className="text-sm font-medium text-slate-700">Numero massimo di record</span>
            <input
              type="number"
              min={1}
              max={1000}
              className="rounded-lg border border-slate-300 px-3 py-2 text-base shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              value={maxResults}
              onChange={(event) => setMaxResults(Number(event.target.value) || 1)}
            />
          </label>

          <label className="mt-7 flex items-center space-x-3">
            <input
              type="checkbox"
              className="h-5 w-5 rounded border border-slate-300 text-slate-600 focus:ring-slate-500"
              checked={useSandbox}
              onChange={(event) => setUseSandbox(event.target.checked)}
            />
            <span className="text-sm font-medium text-slate-700">Usa ambiente Sandbox</span>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={!canSubmit || isSubmitting}
            className="rounded-lg bg-slate-900 px-6 py-2 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSubmitting ? 'Elaborazione…' : 'Genera file Excel'}
          </button>
          {isSubmitting && <span className="text-sm text-slate-500">Richiesta in corso…</span>}
        </div>

        {feedback && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {feedback}
          </div>
        )}

        {successMessage && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        )}
      </form>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Istruzioni rapide</h2>
        <ol className="list-decimal space-y-2 pl-6 text-sm leading-relaxed text-slate-600">
          <li>Accedi alla console Openapi e genera un token con lo scope <code>GET /IT-search</code>.</li>
          <li>Immetti il token nel campo dedicato, specifica codice ATECO e provincia.</li>
          <li>
            Facoltativo: attiva la sandbox per effettuare test con i dati demo forniti da Openapi.
          </li>
          <li>All&apos;invio del modulo verrà avviata la ricerca, con eventuale paginazione automatica.</li>
          <li>Al termine si avvierà il download del file <code>.xlsx</code> generato.</li>
        </ol>
      </section>
    </div>
  );
}
