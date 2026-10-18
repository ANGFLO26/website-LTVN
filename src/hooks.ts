import { useSeoHead } from './components/SeoHead'

export function usePageTitle(title: string) {
  useSeoHead({ title })
}

