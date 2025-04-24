interface ExerciseTagProps {
  name: string;
}

export function ExerciseTag({ name }: ExerciseTagProps) {
  return (
    <span className="bg-gray-200 text-secondary text-xs px-2 py-1 rounded-full">
      {name}
    </span>
  );
}
