(async function() {
  try {
    await loadEmployeeProfile();
    await loadBranches();
    console.log('Employee profile and branches loaded.');
  } catch (err) {
    console.error('Error loading data:', err);
  }
})();
