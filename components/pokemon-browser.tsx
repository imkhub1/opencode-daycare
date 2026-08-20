"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Pokemon = {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: { type: { name: string } }[];
  sprites: {
    other?: { "official-artwork"?: { front_default: string | null } };
  };
};

type FetchedPokemonState = {
  key: string;
  pokemon: Pokemon;
};

const FIRST_POKEMON = 1;
const LAST_POKEMON = 1025;

async function getPokemon(id: number, signal: AbortSignal) {
  const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`, {
    signal,
  });
  if (!response.ok) throw new Error("No se pudo encontrar ese Pokémon.");
  return response.json() as Promise<Pokemon>;
}

function titleCase(value: string) {
  return value
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function PokemonBrowser() {
  const [pokemonId, setPokemonId] = useState(25);
  const [reloadKey, setReloadKey] = useState(0);
  const [fetchedState, setFetchedState] = useState<FetchedPokemonState | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const requestKey = `${pokemonId}-${reloadKey}`;
  const isLoading = !error && fetchedState?.key !== requestKey;
  const pokemon = fetchedState?.pokemon;

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    getPokemon(pokemonId, controller.signal)
      .then((data) => {
        if (!ignore) {
          setFetchedState({ key: `${pokemonId}-${reloadKey}`, pokemon: data });
        }
      })
      .catch((reason: unknown) => {
        if (ignore) return;
        if (
          (reason instanceof Error ||
            (typeof reason === "object" &&
              reason !== null &&
              "name" in reason)) &&
          (reason as { name?: string }).name === "AbortError"
        ) {
          return;
        }
        setError(
          "No pudimos cargar el Pokémon. Revisá tu conexión e intentá de nuevo.",
        );
      });

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [pokemonId, reloadKey]);

  function moveBy(amount: number) {
    setError(null);
    setPokemonId((current) =>
      Math.min(LAST_POKEMON, Math.max(FIRST_POKEMON, current + amount)),
    );
  }

  const artworkUrl =
    pokemon?.sprites.other?.["official-artwork"]?.front_default;

  return (
    <section className="w-full max-w-2xl rounded-[28px] border border-line bg-surface p-5 shadow-xl shadow-[#785a3c]/10 sm:p-8">
      <div className="mb-7 flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-extrabold tracking-[0.14em] text-coral">
            POKÉDEX · EXPLORADOR
          </p>
          <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
            Pokémon actual
          </h1>
          <p className="mt-2 text-sm text-muted">
            Descubrí cada especie con los controles de navegación.
          </p>
        </div>
        <span className="rounded-full bg-coral-soft px-3 py-1.5 text-xs font-extrabold text-[#c5503a]">
          #{String(pokemonId).padStart(4, "0")}
        </span>
      </div>

      <div className="relative flex min-h-[350px] items-center justify-center overflow-hidden rounded-[22px] bg-[#f4ece1] p-6">
        <div
          className="absolute -right-14 -top-16 size-48 rounded-full border-[18px] border-[#eadcc9]"
          aria-hidden="true"
        />
        {isLoading && (
          <div role="status" aria-live="polite">
            <p className="animate-pulse text-sm font-bold text-muted">
              Buscando en la Pokédex…
            </p>
          </div>
        )}
        {error && !isLoading && (
          <div role="alert" aria-live="assertive" className="text-center">
            <p className="font-display text-xl font-semibold text-ink">
              Algo salió mal
            </p>
            <p className="mt-2 max-w-xs text-sm text-muted">{error}</p>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setReloadKey((current) => current + 1);
              }}
              className="mt-5 rounded-xl bg-coral px-4 py-2 text-sm font-extrabold text-white"
            >
              Reintentar
            </button>
          </div>
        )}
        {pokemon && !isLoading && !error && (
          <div className="grid w-full items-center gap-6 sm:grid-cols-[1fr_1fr]">
            {artworkUrl ? (
              <Image
                src={artworkUrl}
                alt={`Ilustración de ${titleCase(pokemon.name)}`}
                width={280}
                height={280}
                priority
                className="mx-auto size-56 object-contain drop-shadow-[0_18px_12px_rgba(101,73,42,0.2)] sm:size-64"
              />
            ) : (
              <div className="mx-auto flex size-56 items-center justify-center rounded-2xl bg-[#eadcc9]/50 text-center text-sm font-bold text-muted sm:size-64">
                Sin imagen disponible
              </div>
            )}
            <div className="text-center sm:text-left">
              <h2 className="font-display text-4xl font-semibold capitalize text-ink">
                {titleCase(pokemon.name)}
              </h2>
              <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                {pokemon.types.map(({ type }) => (
                  <span
                    key={type.name}
                    className="rounded-full bg-[#dceee5] px-3 py-1 text-xs font-extrabold capitalize text-[#3e8b62]"
                  >
                    {type.name}
                  </span>
                ))}
              </div>
              <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-white/70 p-3">
                  <dt className="text-xs text-muted">Altura</dt>
                  <dd className="mt-1 font-extrabold text-ink">
                    {pokemon.height / 10} m
                  </dd>
                </div>
                <div className="rounded-xl bg-white/70 p-3">
                  <dt className="text-xs text-muted">Peso</dt>
                  <dd className="mt-1 font-extrabold text-ink">
                    {pokemon.weight / 10} kg
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => moveBy(-1)}
          disabled={pokemonId === FIRST_POKEMON || isLoading}
          aria-label="Pokémon anterior"
          className="rounded-xl border border-line bg-white px-4 py-3 text-sm font-extrabold text-ink transition hover:bg-[#f4ece1] disabled:cursor-not-allowed disabled:opacity-40"
        >
          ← Anterior
        </button>
        <span className="text-xs font-bold text-muted">
          {pokemonId} de {LAST_POKEMON}
        </span>
        <button
          type="button"
          onClick={() => moveBy(1)}
          disabled={pokemonId === LAST_POKEMON || isLoading}
          aria-label="Pokémon siguiente"
          className="rounded-xl bg-coral px-4 py-3 text-sm font-extrabold text-white transition hover:bg-[#c9573f] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Siguiente →
        </button>
      </div>
    </section>
  );
}
