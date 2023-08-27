let tour = {
  id: "main",
  steps: [
    {
      title: "Welcome to Mach Tarok",
      content: "Start the tour anytime by clicking on 'Tour' here.",
      target: "tour",
      placement: "bottom"
    },
    {
      title: "Start a New Game",
      content: "You can start a new game anytime by clicking on New. Other players can then join you, or you can play alone.",
      target: "roomCardNew",
      placement: "right"
    }
  ]
  //TODO: finish tour
};

function startTour() {
    hopscotch.startTour(tour);
}