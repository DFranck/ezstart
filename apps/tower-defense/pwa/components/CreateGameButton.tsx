import { useCreateGame } from '@/hooks/useCreateGame';
import {
  Button,
  Div,
  Input,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ezstart/ui/components';

type Props = {
  playerName: string;
  setPlayerName: (playerName: string) => void;
};

const CreateGameButton = ({ playerName, setPlayerName }: Props) => {
  const { createGame } = useCreateGame();
  return (
    <Div layout={'grid'}>
      <Input
        placeholder='Player name'
        value={playerName}
        onChange={(e) => setPlayerName(e.target.value)}
      />
      <Tooltip>
        <TooltipTrigger>
          <Button
            className='w-full'
            onClick={() => createGame({ playerName: playerName })}
            disabled={!playerName}
          >
            Create New Game
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {!playerName && 'Please enter a player name'}
        </TooltipContent>
      </Tooltip>
    </Div>
  );
};

export default CreateGameButton;
