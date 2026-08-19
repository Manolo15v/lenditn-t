import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type Item  } from '../../api'

type Scope = 'all'

export function ItemSeeker() {
    const [seek, setSeek] = useState('')
    const [items, setItems] = useState<Item[]>([])
    const [scope, setScope] = useState<Scope>('all')


    const load = useCallback(
        async (next: Scope) => {
            try {
                const res = await api.api.items.$get({ query: {} })
                if (!res.ok) throw new Error('failed')
                setItems((await res.json()).items)
            } catch {

            } finally {

            }
        }, 
    [])

    useEffect(() => {
        void load(scope)
    }, [scope])

    return (
        ""
    )
}