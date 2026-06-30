import { ref } from 'vue'

export function useListDragReorder(onReorder) {
  const dragIndex = ref(null)
  const dragOverIndex = ref(null)

  function onDragStart(index, event) {
    if (event.target.closest('button')) {
      event.preventDefault()
      return
    }
    dragIndex.value = index
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(index))
  }

  function onDragOver(index, event) {
    event.preventDefault()
    dragOverIndex.value = index
  }

  function onDrop(index, event) {
    event.preventDefault()
    if (dragIndex.value == null || dragIndex.value === index) return
    onReorder(dragIndex.value, index)
    dragIndex.value = null
    dragOverIndex.value = null
  }

  function onDragEnd() {
    dragIndex.value = null
    dragOverIndex.value = null
  }

  return {
    dragIndex,
    dragOverIndex,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
  }
}
