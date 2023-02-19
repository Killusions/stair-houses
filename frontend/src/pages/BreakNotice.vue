<template>
  <div class="notice">
    <p>
      Der Vorstand hat entschieden, dass es dieses Semester leider aus
      administrativen Gründen
      <span class="bold">keine Houses Wettkampf</span> geben wird.
    </p>
    <p>
      Währenddessen finden alle unsere Events immer noch gleich wie geplant
      statt, jedoch ohne das Punktesammeln für die Houses.
    </p>
    <br /><br />
    <p>
      We regret to inform you that the council has decided to
      <span class="bold">not</span> carry out the
      <span class="bold">Houses Competition</span> this semester due to
      administrative reasons.
    </p>
    <p>
      In the meantime, all our events will still take place as planned, just
      without the ability to collect points for the houses.
    </p>
  </div>
</template>

<style scoped lang="scss">
  .notice {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    width: calc(100% - 4rem);
    height: calc(85% - 4rem);
    padding: 2rem;
    margin: 0;
    border: none;
  }

  p {
    margin-block-start: 0.5rem;
    margin-block-end: 0.5rem;
    margin-inline-start: 0;
    margin-inline-end: 0;
    text-align: center;

    .bold {
      font-weight: bold;
    }
  }

  @media (max-aspect-ratio: 1/1) {
    .notice {
      height: calc(100% - 15vw - 4rem);
    }
  }
</style>
