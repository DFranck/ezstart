import { useCreateGame } from '@/hooks/useCreateGame'
import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@ezstart/ui/components'
import { LoadingButton } from './LoadingButton'

type Props = {
  playerId: string
}

const CreateGameButton = ({ playerId }: Props) => {
  const { createGame, loading } = useCreateGame()
  const isDisabled = !playerId

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div>
          <LoadingButton
            loading={loading}
            disabled={isDisabled}
            onClick={() => createGame({ playerId })}
            loadingText="Creating game..."
            icon="fa:FaPlus"
            className="w-full"
          >
            Create New Game
          </LoadingButton>
        </div>
      </TooltipTrigger>

      {isDisabled && <TooltipContent>Please enter a player name</TooltipContent>}
    </Tooltip>
  )
}

export default CreateGameButton
