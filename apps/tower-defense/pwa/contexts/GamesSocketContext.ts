'use client'

import { createContext, useContext } from 'react'
import { io, Socket } from 'socket.io-client'

const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!)
export const GamesSocketContext = createContext<Socket>(socket)

export const useGamesSocket = () => useContext(GamesSocketContext)
