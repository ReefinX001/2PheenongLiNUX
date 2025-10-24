/**
 * Thai Calendar Datepicker
 *
 * A simple datepicker that works with Thai Buddhist calendar (BE)
 */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize Date Pickers
  initializeDatePickers();

  function initializeDatePickers() {
    // Wait for all DOM elements to be fully loaded
    if (!document.getElementById('dateFromTrigger') ||
        !document.getElementById('dateToTrigger')) {
      console.log('Date picker elements not found yet, waiting...');
      setTimeout(initializeDatePickers, 100);
      return;
    }

    console.log('Initializing date pickers');

    // Setup date from trigger
    const dateFromTrigger = document.getElementById('dateFromTrigger');
    if (dateFromTrigger) {
      dateFromTrigger.addEventListener('click', function(event) {
        event.stopPropagation();
        const calendar = document.getElementById('calendarDateFrom');
        if (calendar) {
          // Hide all other calendars first
          document.querySelectorAll('.thai-calendar').forEach(cal => {
            cal.style.display = 'none';
          });

          // Toggle this calendar
          calendar.style.display = calendar.style.display === 'block' ? 'none' : 'block';
        }
      });
    }

    // Setup date to trigger
    const dateToTrigger = document.getElementById('dateToTrigger');
    if (dateToTrigger) {
      dateToTrigger.addEventListener('click', function(event) {
        event.stopPropagation();
        const calendar = document.getElementById('calendarDateTo');
        if (calendar) {
          // Hide all other calendars first
          document.querySelectorAll('.thai-calendar').forEach(cal => {
            cal.style.display = 'none';
          });

          // Toggle this calendar
          calendar.style.display = calendar.style.display === 'block' ? 'none' : 'block';
        }
      });
    }

    // Close calendars when clicking outside
    document.addEventListener('click', function(event) {
      if (!event.target.closest('.date-picker-container')) {
        document.querySelectorAll('.thai-calendar').forEach(calendar => {
          calendar.style.display = 'none';
        });
      }
    });

    // Initialize calendars
    document.querySelectorAll('.calendar-dates').forEach(calendar => {
      // Fill calendar with dates
      if (calendar.closest('.thai-calendar').id === 'calendarDateFrom') {
        fillCalendar(calendar, new Date());
      } else if (calendar.closest('.thai-calendar').id === 'calendarDateTo') {
        fillCalendar(calendar, new Date());
      }
    });
  }

  function fillCalendar(calendarContainer, date) {
    // Implementation will be handled by the main script
    console.log('Calendar container ready for initialization');
  }
});
