'use client';

import { Main, Section } from '@ezstart/ui/components';
import { useDevice } from '@ezstart/ui/hooks';
import { useState } from 'react';

export default function PageQuote() {
  const { isDesktop } = useDevice();

  const [form, setForm] = useState({
    organisation: '',
    contactName: '',
    email: '',
    phone: '',
    nbPlants: '',
    types: {
      trees: true,
      hedges: false,
      plants: false,
    },
    date: '',
    distance: '',
  });

  const handleChange = (field: string, value: string | boolean) => {
    if (field.startsWith('types.')) {
      const key = field.split('.')[1] as keyof typeof form.types;
      setForm((prev) => ({
        ...prev,
        types: { ...prev.types, [key]: value as boolean },
      }));
    } else {
      setForm((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Construire le contenu de l'email
    const subject = encodeURIComponent(
      "Demande de devis - Transplantation d'arbres"
    );
    const body = encodeURIComponent(
      `Nom de l'organisme : ${form.organisation}\n` +
        `Contact : ${form.contactName}\n` +
        `Email : ${form.email}\n` +
        `Téléphone : ${form.phone}\n` +
        `Nombre de végétaux : ${form.nbPlants}\n` +
        `Types : ${[
          form.types.trees && 'Arbres et arbustes',
          form.types.hedges && 'Haies et thorbaces',
          form.types.plants && 'Plantes (linaire, grasses, fruitières, etc.)',
        ]
          .filter(Boolean)
          .join(', ')}\n` +
        `Date souhaitée : ${form.date}\n` +
        `Distance de déplacement : ${form.distance} km`
    );

    // Mailto direct (simple)
    window.location.href = `mailto:aseradni@asc-tcd.com?subject=${subject}&body=${body}`;
  };

  return (
    <Main withHeaderOffset>
      {/* SECTION EN-TÊTE */}
      <Section>
        <h1 className='text-3xl font-bold'>Obtenir un devis</h1>
        <p className='text-gray-600 mt-2'>
          Indiquez-nous les informations nécessaires pour établir un devis et
          tarifications pour votre projet. Nous vous recontacterons si nous
          avons besoin d’éléments complémentaires pour un devis sur mesure.
        </p>
      </Section>

      {/* FORMULAIRE */}
      <Section>
        <form onSubmit={handleSubmit} className=' grid  md:grid-cols-2 gap-4'>
          <div>
            <label className='block text-sm font-medium'>
              Nom de l’organisme
            </label>
            <input
              type='text'
              value={form.organisation}
              onChange={(e) => handleChange('organisation', e.target.value)}
              className='w-full mt-1 border rounded-md px-3 py-2'
              required
            />
          </div>

          <div>
            <label className='block text-sm font-medium'>Nom du contact</label>
            <input
              type='text'
              value={form.contactName}
              onChange={(e) => handleChange('contactName', e.target.value)}
              className='w-full mt-1 border rounded-md px-3 py-2'
              required
            />
          </div>

          <div>
            <label className='block text-sm font-medium'>E-mail</label>
            <input
              type='email'
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className='w-full mt-1 border rounded-md px-3 py-2'
              required
            />
          </div>

          <div>
            <label className='block text-sm font-medium'>Téléphone</label>
            <input
              type='tel'
              value={form.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className='w-full mt-1 border rounded-md px-3 py-2'
            />
          </div>

          <div>
            <label className='block text-sm font-medium'>
              Nombre de végétaux à transplanter
            </label>
            <input
              type='number'
              min={1}
              value={form.nbPlants}
              onChange={(e) => handleChange('nbPlants', e.target.value)}
              className='w-full mt-1 border rounded-md px-3 py-2'
            />
          </div>

          <div>
            <label className='block text-sm font-medium'>
              Types de végétaux
            </label>
            <div className='flex flex-col gap-1 mt-2'>
              <label className='flex items-center gap-2'>
                <input
                  type='checkbox'
                  checked={form.types.trees}
                  onChange={(e) =>
                    handleChange('types.trees', e.target.checked)
                  }
                />
                Arbres et arbustes
              </label>
              <label className='flex items-center gap-2'>
                <input
                  type='checkbox'
                  checked={form.types.hedges}
                  onChange={(e) =>
                    handleChange('types.hedges', e.target.checked)
                  }
                />
                Haies et thorbaces
              </label>
              <label className='flex items-center gap-2'>
                <input
                  type='checkbox'
                  checked={form.types.plants}
                  onChange={(e) =>
                    handleChange('types.plants', e.target.checked)
                  }
                />
                Plantes (linaire, grasses, fruitières, etc.)
              </label>
            </div>
          </div>

          <div>
            <label className='block text-sm font-medium'>
              Date de transplantation souhaitée
            </label>
            <input
              type='date'
              value={form.date}
              onChange={(e) => handleChange('date', e.target.value)}
              className='w-full mt-1 border rounded-md px-3 py-2'
            />
          </div>

          <div>
            <label className='block text-sm font-medium'>
              Distance du déplacement (km)
            </label>
            <input
              type='number'
              min={0}
              value={form.distance}
              onChange={(e) => handleChange('distance', e.target.value)}
              className='w-full mt-1 border rounded-md px-3 py-2'
            />
          </div>

          <button
            type='submit'
            className='w-full bg-black text-white py-3 rounded-md hover:bg-gray-800 transition md:col-span-2'
          >
            Envoyer
          </button>
        </form>{' '}
      </Section>
    </Main>
  );
}
