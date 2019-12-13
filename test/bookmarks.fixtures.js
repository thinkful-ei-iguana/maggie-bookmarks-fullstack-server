
function makeBookmarksArray() {
  return [
    {
      id: 1,
      title: 'First ',
      url: 'http://www.one.com',
      description: 'Blah 1',
      rating: 4
    },
    {
      id: 2,
      title: 'Second ',
      url: 'http://www.two.com',
      description: 'Blah 2',
      rating: 2
    },
    {
      id: 3,
      title: 'Third',
      url: 'http://www.three.com',
      description: 'Blah 3',
      rating: 5
    },
    {
      id: 4,
      title: 'Fourth',
      url: 'http://www.four.com',
      description: 'Blah 4',
      rating: 1
    },
  ];
}

module.exports = {
  makeBookmarksArray
};