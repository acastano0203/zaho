import { useApp } from '../../../store/AppStore'
import { cleanCategory, deleteCategory, saveCategory, type CategoryForm } from '../services/categoriesService'

export function useCategoryActions() {
  const { commit } = useApp()
  return {
    save: (f: CategoryForm) => commit(d => saveCategory(d, f), r => r.categories.save({ id: f.id, name: cleanCategory(f.name) })),
    remove: (id: string) => commit(d => deleteCategory(d, id), r => r.categories.remove(id)),
  }
}
