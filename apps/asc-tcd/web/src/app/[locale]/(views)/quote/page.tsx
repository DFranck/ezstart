'use client'

import { Button, Checkbox, H1, Input, Label, Main, P, Section } from '@ezstart/ui/components'
import { useState } from 'react'

export default function PageQuote(): any {
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
  })

  const handleChange = (field: string, value: string | boolean) => {
    if (field.startsWith('types.')) {
      const key = field.split('.')[1] as keyof typeof form.types
      setForm(prev => ({
        ...prev,
        types: { ...prev.types, [key]: value as boolean },
      }))
    } else {
      setForm(prev => ({ ...prev, [field]: value }))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Construire le contenu de l'email
    const subject = encodeURIComponent("Demande de devis - Transplantation d'arbres")
    const body = encodeURIComponent(
      `✅ **Nouvelle demande de devis – Transplantation d'arbres**\n\n` +
        `*Organisation* : ${form.organisation}\n` +
        `*Contact* : ${form.contactName}\n` +
        `*Email* : ${form.email}\n` +
        `*Téléphone* : ${form.phone || 'Non renseigné'}\n\n` +
        `*Nombre de végétaux* : ${form.nbPlants || 'Non précisé'}\n` +
        `*Types sélectionnés* :\n` +
        `${form.types.trees ? '   - Arbres et arbustes\n' : ''}` +
        `${form.types.hedges ? '   - Haies et thorbaces\n' : ''}` +
        `${form.types.plants ? '   - Plantes diverses\n' : ''}\n` +
        `*Date souhaitée* : ${form.date || 'Non précisée'}\n` +
        `*Distance de déplacement* : ${form.distance || 'Non précisée'} km\n\n` +
        `---\nEnvoyé automatiquement depuis le formulaire ASC-TCD`
    )

    // Mailto direct (simple)
    window.location.href = `mailto:aseradni@asc-tcd.com?subject=${subject}&body=${body}`
  }

  return (
    <Main withHeaderOffset className="pt-10">
      {/* SECTION EN-TÊTE */}
      <Section className="space-y-4">
        <H1>Obtenir un devis</H1>
        <P variant="description" className="max-w-2xl">
          Indiquez-nous les informations nécessaires pour établir un devis et tarifications pour
          votre projet. Nous vous recontacterons si nous avons besoin d’éléments complémentaires
          pour un devis sur mesure.
        </P>
      </Section>

      {/* FORMULAIRE */}
      <Section className="py-8">
        <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="organisation">Nom de l'organisme</Label>
            <Input
              id="organisation"
              type="text"
              value={form.organisation}
              onChange={e => handleChange('organisation', e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="contactName">Nom du contact</Label>
            <Input
              id="contactName"
              type="text"
              value={form.contactName}
              onChange={e => handleChange('contactName', e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={e => handleChange('email', e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={e => handleChange('phone', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="nbPlants">Nombre de végétaux à transplanter</Label>
            <Input
              id="nbPlants"
              type="number"
              min={1}
              value={form.nbPlants}
              onChange={e => handleChange('nbPlants', e.target.value)}
            />
          </div>

          <div>
            <Label>Types de végétaux</Label>
            <div className="flex flex-col gap-1 mt-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="trees"
                  checked={form.types.trees}
                  onCheckedChange={checked => handleChange('types.trees', checked)}
                />
                <Label htmlFor="trees">Arbres et arbustes</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="hedges"
                  checked={form.types.hedges}
                  onCheckedChange={checked => handleChange('types.hedges', checked)}
                />
                <Label htmlFor="hedges">Haies et thorbaces</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="plants"
                  checked={form.types.plants}
                  onCheckedChange={checked => handleChange('types.plants', checked)}
                />
                <Label htmlFor="plants">Plantes (linaire, grasses, fruitières, etc.)</Label>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="date">Date de transplantation souhaitée</Label>
            <Input
              id="date"
              type="date"
              value={form.date}
              onChange={e => handleChange('date', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="distance">Distance du déplacement (km)</Label>
            <Input
              id="distance"
              type="number"
              min={0}
              value={form.distance}
              onChange={e => handleChange('distance', e.target.value)}
            />
          </div>

          <Button type="submit" className="md:col-span-2">
            Envoyer
          </Button>
        </form>{' '}
      </Section>
    </Main>
  )
}
