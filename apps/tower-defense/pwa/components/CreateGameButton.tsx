import { useCreateGame } from '@/hooks/useCreateGame'
import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@ezstart/ui/components'

type Props = {
  playerName: string
}

const CreateGameButton = ({ playerName }: Props) => {
  const { createGame } = useCreateGame()
  const isDisabled = !playerName

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div>
          <Button disabled={isDisabled} onClick={() => createGame({ playerName })}>
            Create New Game
          </Button>
        </div>
      </TooltipTrigger>

      {isDisabled && <TooltipContent>Please enter a player name</TooltipContent>}
    </Tooltip>
  )
}

export default CreateGameButton
