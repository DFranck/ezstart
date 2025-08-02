import { useCreateGame } from '@/hooks/useCreateGame'
import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@ezstart/ui/components'

type Props = {
  playerId: string
}

const CreateGameButton = ({ playerId }: Props) => {
  const { createGame } = useCreateGame()
  const isDisabled = !playerId

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div>
          <Button disabled={isDisabled} onClick={() => createGame({ playerId })}>
            Create New Game
          </Button>
        </div>
      </TooltipTrigger>

      {isDisabled && <TooltipContent>Please enter a player name</TooltipContent>}
    </Tooltip>
  )
}

export default CreateGameButton
