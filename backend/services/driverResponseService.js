
export const waitForDriverResponse = async (driverId) => {

    return new Promise((resolve) => {

        const timeout = setTimeout(() => {
            resolve(false);

        }, 15000);

        io.once(`driverAccepted_${driverId}`, () => {
            clearTimeout(timeout);
            resolve(true);
        } );
    });
};