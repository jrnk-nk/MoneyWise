/* Original MoneyWise lessons and questions, kept separate from the game UI. */
(() => {
    const lessons = [

        {
            title: "1. Needs vs. Wants",

            content: `
                <p>
                    <b>Needs</b> are essential things people require
                    for daily living, safety and education. Examples
                    include basic food, water, shelter and necessary
                    school materials.
                </p>

                <p>
                    <b>Wants</b> are things people would like to have
                    but can live without. Examples include optional
                    video games, fashionable accessories and
                    additional entertainment.
                </p>

                <p>
                    Understanding the difference between needs and
                    wants helps people make better spending decisions.
                    When money is limited, essential needs should
                    generally be prioritised before non-essential
                    purchases.
                </p>

                <p>
                    The Consumer Financial Protection Bureau includes
                    activities that help students understand how
                    distinguishing needs from wants affects daily
                    financial decisions
                    (Consumer Financial Protection Bureau,
                    "Find Financial Literacy Activities").
                </p>

                <p>
                    <b>Example:</b> If you have enough money for lunch
                    or an optional video game, buying lunch should
                    generally be the priority.
                </p>

                <p>
                    <b>Think about it:</b> Can something that is a want
                    for one person become a need for another person?
                </p>
            `
        },


        {
            title: "2. Budgeting and Money Management",

            content: `
                <p>
                    A <b>budget</b> is a financial plan that shows
                    how money will be received and spent over a
                    particular period.
                </p>

                <p>
                    Budgeting helps people understand their income,
                    control their expenses and identify how much
                    money they have remaining.
                </p>

                <p>
                    The basic budgeting formula is:
                </p>

                <p>
                    <b>
                        Remaining Balance = Starting Balance
                        + Income - Expenses
                    </b>
                </p>

                <p>
                    <b>Example:</b> Imagine you begin with GH₵100,
                    receive GH₵50 and spend GH₵30.
                    Your remaining balance will be GH₵120.
                </p>

                <p>
                    Keeping records of spending makes it easier
                    to identify unnecessary expenses and adjust
                    financial decisions.
                </p>

                <p>
                    Financial education encourages young people
                    to develop planning skills and make informed
                    decisions about money
                    (Consumer Financial Protection Bureau,
                    "Youth Financial Education").
                </p>

                <p>
                    <b>Think about it:</b> What could happen if
                    someone consistently spends more money
                    than they receive?
                </p>
            `
        },


        {
            title: "3. Saving and Financial Goals",

            content: `
                <p>
                    <b>Saving</b> means setting aside some money
                    for future use instead of spending all of it
                    immediately.
                </p>

                <p>
                    People save for different reasons. These may
                    include purchasing something important,
                    paying for education, preparing for emergencies
                    or achieving a long-term financial goal.
                </p>

                <p>
                    A savings goal should be clear and realistic.
                    It should identify what you are saving for,
                    the amount required and how much you can
                    regularly put aside.
                </p>

                <p>
                    Savings progress can be calculated using:
                </p>

                <p>
                    <b>
                        Savings Progress =
                        (Amount Saved / Target Amount) x 100
                    </b>
                </p>

                <p>
                    <b>Example:</b> If your target is GH₵200 and
                    you have saved GH₵50, you have completed
                    25% of your savings goal.
                </p>

                <p>
                    An emergency fund is money kept aside for
                    unexpected essential expenses. It can help
                    people deal with unexpected costs without
                    immediately depending on borrowing.
                </p>

                <p>
                    Setting goals and making plans are important
                    parts of developing financial capability
                    (Consumer Financial Protection Bureau,
                    "Youth Financial Education").
                </p>

                <p>
                    <b>Think about it:</b> Why might saving a
                    small amount regularly be more realistic
                    than trying to save a very large amount
                    at once?
                </p>
            `
        },


        {
            title: "4. Saving vs. Investing",

            content: `
                <p>
                    Saving and investing are both ways of
                    preparing for future financial needs,
                    but they are not the same.
                </p>

                <p>
                    <b>Saving</b> usually involves keeping money
                    somewhere relatively accessible and stable,
                    such as a savings account.
                </p>

                <p>
                    <b>Investing</b> involves putting money into
                    assets such as stocks or bonds with the
                    expectation of receiving a return over time.
                </p>

                <p>
                    Unlike many savings options, investments
                    can increase or decrease in value. This
                    means that investors may make a profit
                    or experience a loss.
                </p>

                <p>
                    Investor.gov explains that investing involves
                    purchasing assets with the expectation of
                    earning a return, while also accepting
                    investment risk (Investor.gov,
                    "Introduction to Investing").
                </p>

                <p>
                    <b>Example:</b> Money needed for school
                    expenses next month would generally be
                    better kept accessible rather than placed
                    in a risky long-term investment.
                </p>

                <p>
                    <b>Think about it:</b> Why should people
                    consider when they will need their money
                    before deciding whether to save or invest?
                </p>
            `
        },


        {
            title: "5. Investment Risk and Return",

            content: `
                <p>
                    <b>Return</b> refers to the gain or loss
                    made on an investment. It measures how
                    the value of an investment changes over
                    a particular period.
                </p>

                <p>
                    <b>Risk</b> refers to the possibility that
                    an investment may not perform as expected.
                    This includes the possibility of losing
                    some or all of the money invested.
                </p>

                <p>
                    Investments with higher potential returns
                    often involve higher levels of risk.
                    However, higher returns are never
                    guaranteed.
                </p>

                <p>
                    <b>Example:</b> An investment of GH₵100
                    that increases by 10% becomes GH₵110.
                    If it decreases by 10%, it becomes GH₵90.
                </p>

                <p>
                    Investors should understand the risks
                    involved before making investment
                    decisions. Investor.gov explains that
                    investments involve risk and that
                    investment values can fluctuate
                    (Investor.gov, "Introduction to Investing").
                </p>

                <p>
                    <b>Think about it:</b> Why would it be
                    unwise to invest money that you cannot
                    afford to lose?
                </p>
            `
        },


        {
            title: "6. Compound Growth",

            content: `
                <p>
                    <b>Compound growth</b> occurs when returns
                    are earned not only on the original amount
                    of money but also on previous returns
                    that have accumulated.
                </p>

                <p>
                    This means that money can grow over time
                    because each new period's growth may be
                    calculated on a larger amount.
                </p>

                <p>
                    <b>Example:</b> Imagine GH₵100 earns 10%
                    in the first year. It becomes GH₵110.
                </p>

                <p>
                    If it earns another 10% in the second year,
                    the calculation is based on GH₵110.
                    The new amount becomes GH₵121.
                </p>

                <p>
                    This example assumes a constant rate and
                    no fees or taxes. Actual investment returns
                    vary and are not guaranteed.
                </p>

                <p>
                    Investor.gov provides a compound interest
                    calculator that demonstrates how the
                    starting amount, time and interest rate
                    can affect hypothetical growth
                    (Investor.gov, "Compound Interest Calculator").
                </p>

                <p>
                    <b>Think about it:</b> Why does compound
                    growth use the previous accumulated amount
                    instead of only the original amount?
                </p>
            `
        },


        {
            title: "7. Diversification",

            content: `
                <p>
                    <b>Diversification</b> is an investment
                    strategy that involves spreading money
                    across different investments instead
                    of depending on just one.
                </p>

                <p>
                    The purpose is to avoid placing all
                    investment money in a single asset,
                    company or category.
                </p>

                <p>
                    Different investments may perform
                    differently under various economic
                    conditions. Spreading investments can
                    therefore reduce the effect that one
                    poor-performing investment has on
                    an overall portfolio.
                </p>

                <p>
                    <b>Example:</b> An investor who puts all
                    their money into one company's shares
                    depends heavily on that company's
                    performance.
                </p>

                <p>
                    An investor who spreads money across
                    different types of investments is less
                    dependent on one company alone.
                </p>

                <p>
                    However, diversification cannot eliminate
                    all investment risk or guarantee a profit
                    (Investor.gov, "Introduction to Investing").
                </p>

                <p>
                    <b>Think about it:</b> Why is spreading
                    investments not the same as completely
                    eliminating investment risk?
                </p>
            `
        }

    ];


    const questions = [

        {
            question: "Which of the following is usually a need?",
            options: [
                "Essential food",
                "A new video game",
                "Designer accessories",
                "An extra movie ticket"
            ],
            answer: 0,
            explanation:
                "Essential food is a basic need. The other choices are generally optional wants."
        },

        {
            question:
                "You start with GH₵100, receive GH₵50 and spend GH₵30. What remains?",
            options: [
                "GH₵80",
                "GH₵120",
                "GH₵150",
                "GH₵180"
            ],
            answer: 1,
            explanation:
                "GH₵100 + GH₵50 - GH₵30 = GH₵120."
        },

        {
            question: "What is the main purpose of a savings goal?",
            options: [
                "To plan money for a future purpose",
                "To guarantee investment profits",
                "To spend all available money",
                "To avoid recording expenses"
            ],
            answer: 0,
            explanation:
                "A savings goal helps someone plan and measure progress towards a future financial purpose."
        },

        {
            question: "Which statement about investing is correct?",
            options: [
                "Investments can never lose value",
                "Investment returns are always guaranteed",
                "Investments involve uncertainty and possible losses",
                "Investing and saving are exactly the same"
            ],
            answer: 2,
            explanation:
                "Investment values can increase or decrease. Returns are not guaranteed."
        },

        {
            question:
                "An investment of GH₵100 falls by 10%. What is its new value?",
            options: [
                "GH₵90",
                "GH₵100",
                "GH₵105",
                "GH₵110"
            ],
            answer: 0,
            explanation:
                "10% of GH₵100 is GH₵10. GH₵100 - GH₵10 = GH₵90."
        },

        {
            question: "What does compound growth mean?",
            options: [
                "Growth can be earned on previous growth",
                "Spending more money every month",
                "Removing all investment risk",
                "Only earning on the original amount"
            ],
            answer: 0,
            explanation:
                "Compound growth includes growth on the original amount and accumulated growth."
        },

        {
            question: "What is diversification?",
            options: [
                "Putting all money into one investment",
                "Spreading money across different investments",
                "Choosing only the highest advertised return",
                "Spending all savings immediately"
            ],
            answer: 1,
            explanation:
                "Diversification spreads investment exposure, although it cannot remove all risk."
        },

        {
            question:
                "What should an investor consider when looking at a high possible return?",
            options: [
                "Assume there is no risk",
                "Treat the return as guaranteed",
                "Consider the possible risk of loss",
                "Ignore how the investment works"
            ],
            answer: 2,
            explanation:
                "Potential returns should always be considered alongside investment risks."
        }

    ];



    window.MoneyWiseContent = { lessons, questions };
})();
